import { resolveMaterial } from '../../engine/materials';
import { buildPartInstances } from '../../engine/part-instances';
import { placementTransformForRoom } from '../geometry/placement-geometry';
import { triangulatePolygon, triangulatePolygonWithHoles } from '../geometry/polygon';
import type {
  Apartment,
  CabinetPlacement,
  FurniturePalette,
  FurniturePlacement,
  Opening,
  Point,
  Room,
  Wall,
} from '../types';
import { buildFurniturePrimitives } from './furniture';

type Color = readonly [number, number, number];
type Point3 = readonly [number, number, number];
type Normal3 = readonly [number, number, number];

export const ROOM_MATERIAL_IDS = {
  floor: 0,
  wall: 1,
  wood: 2,
  metal: 3,
  glass: 4,
  fabric: 5,
  ceramic: 6,
  shadow: 7,
} as const;

type RoomMaterialId = (typeof ROOM_MATERIAL_IDS)[keyof typeof ROOM_MATERIAL_IDS];
type DoorOpening = Extract<Opening, { kind: 'door' }>;
type WindowOpening = Extract<Opening, { kind: 'window' }>;

export interface ApartmentRoomScene {
  vertices: Float32Array;
  objects?: { id: string; startVertex: number; vertexCount: number }[];
  vertexStride: number;
  wallCount: number;
  cutawayWallCount: number;
  cutawayWallIds: readonly string[];
  cabinetCount: number;
  furnitureCount: number;
  bedCount: number;
  openingCount: number;
  roomWidth: number;
  roomDepth: number;
  targetHeight: number;
  millimetresPerUnit?: number;
}

export interface ApartmentRoomSceneOptions {
  showFurniture?: boolean;
  furniturePalette?: FurniturePalette;
  cameraYaw?: number;
  selectedObjectId?: string;
}

interface SceneScale {
  centerX: number;
  centerZ: number;
  divisor: number;
}

interface BoxInput {
  centerX: number;
  centerY: number;
  centerZ: number;
  width: number;
  height: number;
  depth: number;
  yaw: number;
  color: Color;
  materialId: RoomMaterialId;
}

const FLOOR_COLOR: Color = [0.82, 0.78, 0.7];
const WALL_COLOR: Color = [0.91, 0.89, 0.84];
const GLASS_COLOR: Color = [0.47, 0.67, 0.72];
const FRAME_COLOR: Color = [0.72, 0.71, 0.68];
const DOOR_COLOR: Color = [0.54, 0.36, 0.24];
const SELECTION_COLOR: Color = [0.94, 0.58, 0.18];
const DEFAULT_WALL_HEIGHT = 2_700;
const DEFAULT_WALL_THICKNESS = 140;
const DOOR_HEIGHT = 2_100;
const WINDOW_HEIGHT = 1_200;
const WINDOW_SILL = 900;
const CUTAWAY_WALL_HEIGHT = 360;
const ROOM_VERTEX_STRIDE = 10;
export const DEFAULT_ROOM_CAMERA_YAW = 2.62;

function tint(color: Color, factor: number): Color {
  return [Math.min(1, color[0] * factor), Math.min(1, color[1] * factor), Math.min(1, color[2] * factor)];
}

function parseHexColor(value: string): Color {
  const match = /^#([\dA-F]{6})$/i.exec(value);
  if (!match) return [0.58, 0.38, 0.24];
  const numeric = Number.parseInt(match[1], 16);
  return [((numeric >> 16) & 255) / 255, ((numeric >> 8) & 255) / 255, (numeric & 255) / 255];
}

function pushVertex(target: number[], point: Point3, normal: Normal3, color: Color, materialId: RoomMaterialId): void {
  target.push(point[0], point[1], point[2], normal[0], normal[1], normal[2], color[0], color[1], color[2], materialId);
}

function addQuad(
  target: number[],
  a: Point3,
  b: Point3,
  c: Point3,
  d: Point3,
  color: Color,
  materialId: RoomMaterialId,
): void {
  const edgeOne: Point3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const edgeTwo: Point3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const cross: Point3 = [
    edgeOne[1] * edgeTwo[2] - edgeOne[2] * edgeTwo[1],
    edgeOne[2] * edgeTwo[0] - edgeOne[0] * edgeTwo[2],
    edgeOne[0] * edgeTwo[1] - edgeOne[1] * edgeTwo[0],
  ];
  const length = Math.hypot(...cross) || 1;
  const normal: Normal3 = [cross[0] / length, cross[1] / length, cross[2] / length];
  for (const point of [a, b, c, a, c, d]) pushVertex(target, point, normal, color, materialId);
}

function rotateBoxCorner(
  centerX: number,
  centerY: number,
  centerZ: number,
  yaw: number,
  localX: number,
  localY: number,
  localZ: number,
): Point3 {
  const cosine = Math.cos(yaw);
  const sine = Math.sin(yaw);
  return [centerX + localX * cosine - localZ * sine, centerY + localY, centerZ + localX * sine + localZ * cosine];
}

function addBox(target: number[], input: BoxInput): void {
  if (input.width <= 0 || input.height <= 0 || input.depth <= 0) return;
  const halfWidth = input.width / 2;
  const halfHeight = input.height / 2;
  const halfDepth = input.depth / 2;
  const corners = [
    rotateBoxCorner(input.centerX, input.centerY, input.centerZ, input.yaw, -halfWidth, -halfHeight, -halfDepth),
    rotateBoxCorner(input.centerX, input.centerY, input.centerZ, input.yaw, halfWidth, -halfHeight, -halfDepth),
    rotateBoxCorner(input.centerX, input.centerY, input.centerZ, input.yaw, halfWidth, halfHeight, -halfDepth),
    rotateBoxCorner(input.centerX, input.centerY, input.centerZ, input.yaw, -halfWidth, halfHeight, -halfDepth),
    rotateBoxCorner(input.centerX, input.centerY, input.centerZ, input.yaw, -halfWidth, -halfHeight, halfDepth),
    rotateBoxCorner(input.centerX, input.centerY, input.centerZ, input.yaw, halfWidth, -halfHeight, halfDepth),
    rotateBoxCorner(input.centerX, input.centerY, input.centerZ, input.yaw, halfWidth, halfHeight, halfDepth),
    rotateBoxCorner(input.centerX, input.centerY, input.centerZ, input.yaw, -halfWidth, halfHeight, halfDepth),
  ] as const;
  addQuad(target, corners[4], corners[5], corners[6], corners[7], tint(input.color, 1.04), input.materialId);
  addQuad(target, corners[1], corners[0], corners[3], corners[2], tint(input.color, 0.72), input.materialId);
  addQuad(target, corners[0], corners[4], corners[7], corners[3], tint(input.color, 0.84), input.materialId);
  addQuad(target, corners[5], corners[1], corners[2], corners[6], tint(input.color, 0.9), input.materialId);
  addQuad(target, corners[3], corners[7], corners[6], corners[2], tint(input.color, 1.12), input.materialId);
  addQuad(target, corners[0], corners[1], corners[5], corners[4], tint(input.color, 0.62), input.materialId);
}

function roomScale(room: Room): SceneScale & { width: number; depth: number } {
  const xs = room.polygon.map((point) => point.x);
  const zs = room.polygon.map((point) => point.y);
  const minimumX = Math.min(...xs);
  const maximumX = Math.max(...xs);
  const minimumZ = Math.min(...zs);
  const maximumZ = Math.max(...zs);
  const width = Math.max(1, maximumX - minimumX);
  const depth = Math.max(1, maximumZ - minimumZ);
  return {
    centerX: (minimumX + maximumX) / 2,
    centerZ: (minimumZ + maximumZ) / 2,
    divisor: Math.max(width, depth, DEFAULT_WALL_HEIGHT) / 2,
    width,
    depth,
  };
}

function localPoint(scale: SceneScale, x: number, height: number, z: number): Point3 {
  return [(x - scale.centerX) / scale.divisor, height / scale.divisor, (z - scale.centerZ) / scale.divisor];
}

function addFloor(target: number[], room: Room, scale: SceneScale, holes: Point[][]): void {
  if (room.polygon.length < 3) return;
  for (const triangle of triangulatePolygonWithHoles(room.polygon, holes)) {
    for (const point of triangle)
      pushVertex(target, localPoint(scale, point.x, -12, point.y), [0, 1, 0], FLOOR_COLOR, ROOM_MATERIAL_IDS.floor);
  }
}

function addArchitecturalPrism(target: number[], polygon: Point[], height: number, scale: SceneScale): void {
  if (height <= 0) return;
  for (const triangle of triangulatePolygon(polygon)) {
    for (const point of triangle)
      pushVertex(target, localPoint(scale, point.x, height, point.y), [0, 1, 0], WALL_COLOR, ROOM_MATERIAL_IDS.wall);
  }
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i],
      b = polygon[(i + 1) % polygon.length];
    addQuad(
      target,
      localPoint(scale, a.x, 0, a.y),
      localPoint(scale, b.x, 0, b.y),
      localPoint(scale, b.x, height, b.y),
      localPoint(scale, a.x, height, a.y),
      WALL_COLOR,
      ROOM_MATERIAL_IDS.wall,
    );
  }
}

function openingHeight(opening: Opening): number {
  return opening.height ?? (opening.kind === 'door' ? DOOR_HEIGHT : WINDOW_HEIGHT);
}

function openingSill(opening: Opening): number {
  return opening.kind === 'window' ? (opening.sillHeight ?? WINDOW_SILL) : 0;
}

function addWallSection(
  target: number[],
  wall: Wall,
  scale: SceneScale,
  start: number,
  end: number,
  bottom: number,
  top: number,
): void {
  const wallLength = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
  const length = end - start;
  const height = top - bottom;
  if (wallLength <= 0 || length <= 0 || height <= 0) return;
  const tangentX = (wall.end.x - wall.start.x) / wallLength;
  const tangentZ = (wall.end.y - wall.start.y) / wallLength;
  const middle = start + length / 2;
  const center = localPoint(
    scale,
    wall.start.x + tangentX * middle,
    bottom + height / 2,
    wall.start.y + tangentZ * middle,
  );
  addBox(target, {
    centerX: center[0],
    centerY: center[1],
    centerZ: center[2],
    width: length / scale.divisor,
    height: height / scale.divisor,
    depth: (wall.thickness ?? DEFAULT_WALL_THICKNESS) / scale.divisor,
    yaw: Math.atan2(tangentZ, tangentX),
    color: WALL_COLOR,
    materialId: ROOM_MATERIAL_IDS.wall,
  });
}

function addWall(target: number[], wall: Wall, scale: SceneScale, heightOverride?: number): void {
  const length = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
  const height = heightOverride ?? wall.height ?? DEFAULT_WALL_HEIGHT;
  let cursor = 0;
  const openings = [...wall.openings].sort((first, second) => first.offset - second.offset);
  for (const opening of openings) {
    const start = Math.max(cursor, Math.min(length, opening.offset));
    const end = Math.max(start, Math.min(length, opening.offset + opening.width));
    addWallSection(target, wall, scale, cursor, start, 0, height);
    const sill = Math.min(height, openingSill(opening));
    const top = Math.min(height, sill + openingHeight(opening));
    addWallSection(target, wall, scale, start, end, 0, sill);
    addWallSection(target, wall, scale, start, end, top, height);
    cursor = end;
  }
  addWallSection(target, wall, scale, cursor, length, 0, height);
}

function addWallAlignedBox(
  target: number[],
  wall: Wall,
  scale: SceneScale,
  along: number,
  bottom: number,
  width: number,
  height: number,
  depth: number,
  color: Color,
  materialId: RoomMaterialId,
): void {
  const wallLength = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
  if (wallLength <= 0) return;
  const tangentX = (wall.end.x - wall.start.x) / wallLength;
  const tangentZ = (wall.end.y - wall.start.y) / wallLength;
  const center = localPoint(
    scale,
    wall.start.x + tangentX * along,
    bottom + height / 2,
    wall.start.y + tangentZ * along,
  );
  addBox(target, {
    centerX: center[0],
    centerY: center[1],
    centerZ: center[2],
    width: width / scale.divisor,
    height: height / scale.divisor,
    depth: depth / scale.divisor,
    yaw: Math.atan2(tangentZ, tangentX),
    color,
    materialId,
  });
}

function addWindowDetail(target: number[], wall: Wall, opening: WindowOpening, scale: SceneScale): void {
  const sill = openingSill(opening);
  const height = openingHeight(opening);
  const frame = Math.min(55, opening.width * 0.08, height * 0.08);
  const center = opening.offset + opening.width / 2;
  addWallAlignedBox(
    target,
    wall,
    scale,
    center,
    sill + frame,
    Math.max(20, opening.width - frame * 2),
    Math.max(20, height - frame * 2),
    18,
    GLASS_COLOR,
    ROOM_MATERIAL_IDS.glass,
  );
  addWallAlignedBox(
    target,
    wall,
    scale,
    opening.offset + frame / 2,
    sill,
    frame,
    height,
    70,
    FRAME_COLOR,
    ROOM_MATERIAL_IDS.metal,
  );
  addWallAlignedBox(
    target,
    wall,
    scale,
    opening.offset + opening.width - frame / 2,
    sill,
    frame,
    height,
    70,
    FRAME_COLOR,
    ROOM_MATERIAL_IDS.metal,
  );
  addWallAlignedBox(target, wall, scale, center, sill, opening.width, frame, 70, FRAME_COLOR, ROOM_MATERIAL_IDS.metal);
  addWallAlignedBox(
    target,
    wall,
    scale,
    center,
    sill + height - frame,
    opening.width,
    frame,
    70,
    FRAME_COLOR,
    ROOM_MATERIAL_IDS.metal,
  );
  if (opening.width >= 900) {
    addWallAlignedBox(
      target,
      wall,
      scale,
      center,
      sill,
      frame * 0.72,
      height,
      78,
      FRAME_COLOR,
      ROOM_MATERIAL_IDS.metal,
    );
  }
}

function roomInwardNormal(room: Room, wall: Wall): readonly [number, number] {
  const wallLength = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y) || 1;
  const tangentX = (wall.end.x - wall.start.x) / wallLength;
  const tangentZ = (wall.end.y - wall.start.y) / wallLength;
  const centroidX = room.polygon.reduce((sum, point) => sum + point.x, 0) / room.polygon.length;
  const centroidZ = room.polygon.reduce((sum, point) => sum + point.y, 0) / room.polygon.length;
  const middleX = (wall.start.x + wall.end.x) / 2;
  const middleZ = (wall.start.y + wall.end.y) / 2;
  const leftNormal: readonly [number, number] = [-tangentZ, tangentX];
  const dot = (centroidX - middleX) * leftNormal[0] + (centroidZ - middleZ) * leftNormal[1];
  return dot >= 0 ? leftNormal : [-leftNormal[0], -leftNormal[1]];
}

function addDoorDetail(target: number[], room: Room, wall: Wall, opening: DoorOpening, scale: SceneScale): void {
  if (opening.swing === 'sliding') {
    addWindowDetail(target, wall, { ...opening, kind: 'window', sillHeight: 0 }, scale);
    return;
  }
  const wallLength = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
  if (wallLength <= 0) return;
  const tangentX = (wall.end.x - wall.start.x) / wallLength;
  const tangentZ = (wall.end.y - wall.start.y) / wallLength;
  const inward = roomInwardNormal(room, wall);
  const hingeAtEnd = opening.swing === 'right';
  const hingeDistance = opening.offset + (hingeAtEnd ? opening.width : 0);
  const hingeX = wall.start.x + tangentX * hingeDistance;
  const hingeZ = wall.start.y + tangentZ * hingeDistance;
  const baseX = hingeAtEnd ? -tangentX : tangentX;
  const baseZ = hingeAtEnd ? -tangentZ : tangentZ;
  const directionX = baseX * 0.46 + inward[0] * 0.89;
  const directionZ = baseZ * 0.46 + inward[1] * 0.89;
  const directionLength = Math.hypot(directionX, directionZ) || 1;
  const normalizedX = directionX / directionLength;
  const normalizedZ = directionZ / directionLength;
  const leafWidth = opening.width * 0.94;
  const center = localPoint(
    scale,
    hingeX + normalizedX * (leafWidth / 2) + inward[0] * 18,
    openingHeight(opening) / 2,
    hingeZ + normalizedZ * (leafWidth / 2) + inward[1] * 18,
  );
  addBox(target, {
    centerX: center[0],
    centerY: center[1],
    centerZ: center[2],
    width: leafWidth / scale.divisor,
    height: (openingHeight(opening) - 24) / scale.divisor,
    depth: 42 / scale.divisor,
    yaw: Math.atan2(normalizedZ, normalizedX),
    color: DOOR_COLOR,
    materialId: ROOM_MATERIAL_IDS.wood,
  });
}

function addOpeningDetails(target: number[], room: Room, wall: Wall, scale: SceneScale): void {
  for (const opening of wall.openings) {
    if (opening.kind === 'window') addWindowDetail(target, wall, opening, scale);
    else addDoorDetail(target, room, wall, opening, scale);
  }
}

function isCameraFacingWall(wall: Wall, scale: SceneScale, cameraYaw: number): boolean {
  const middleX = (wall.start.x + wall.end.x) / 2 - scale.centerX;
  const middleZ = (wall.start.y + wall.end.y) / 2 - scale.centerZ;
  const cameraDirectionX = -Math.sin(cameraYaw);
  const cameraDirectionZ = -Math.cos(cameraYaw);
  return middleX * cameraDirectionX + middleZ * cameraDirectionZ > 0;
}

function materialForFurniture(item: FurniturePlacement): RoomMaterialId {
  if (item.material === 'fabric') return ROOM_MATERIAL_IDS.fabric;
  if (item.material === 'metal') return ROOM_MATERIAL_IDS.metal;
  if (item.material === 'glass') return ROOM_MATERIAL_IDS.glass;
  if (item.material === 'ceramic') return ROOM_MATERIAL_IDS.ceramic;
  if (item.material === 'wood' || item.material === 'painted') return ROOM_MATERIAL_IDS.wood;
  if (item.kind === 'single-bed' || item.kind === 'double-bed' || item.kind === 'sofa' || item.kind === 'rug') {
    return ROOM_MATERIAL_IDS.fabric;
  }
  if (
    item.kind === 'sink' ||
    item.kind === 'oven' ||
    item.kind === 'refrigerator' ||
    item.kind === 'washer' ||
    item.kind === 'dryer'
  ) {
    return ROOM_MATERIAL_IDS.metal;
  }
  if (item.kind === 'toilet' || item.kind === 'shower' || item.kind === 'bathtub' || item.kind === 'vanity') {
    return ROOM_MATERIAL_IDS.ceramic;
  }
  return ROOM_MATERIAL_IDS.wood;
}

function addFurniture(
  target: number[],
  item: FurniturePlacement,
  palette: FurniturePalette,
  scale: SceneScale,
  selected: boolean,
): void {
  if (selected) {
    const highlight = localPoint(scale, item.x, 8, item.y);
    addBox(target, {
      centerX: highlight[0],
      centerY: highlight[1],
      centerZ: highlight[2],
      width: (item.width + 140) / scale.divisor,
      height: 12 / scale.divisor,
      depth: (item.depth + 140) / scale.divisor,
      yaw: item.rotation,
      color: SELECTION_COLOR,
      materialId: ROOM_MATERIAL_IDS.ceramic,
    });
  }
  if (item.elevation < 100) {
    const shadow = localPoint(scale, item.x, 3, item.y);
    addBox(target, {
      centerX: shadow[0],
      centerY: shadow[1],
      centerZ: shadow[2],
      width: (item.width * 1.04) / scale.divisor,
      height: 6 / scale.divisor,
      depth: (item.depth * 1.04) / scale.divisor,
      yaw: item.rotation,
      color: [0.55, 0.52, 0.47],
      materialId: ROOM_MATERIAL_IDS.shadow,
    });
  }
  const cosine = Math.cos(item.rotation);
  const sine = Math.sin(item.rotation);
  for (const primitive of buildFurniturePrimitives(item, palette)) {
    const center = localPoint(
      scale,
      item.x + primitive.x * cosine - primitive.z * sine,
      item.elevation + primitive.y,
      item.y + primitive.x * sine + primitive.z * cosine,
    );
    addBox(target, {
      centerX: center[0],
      centerY: center[1],
      centerZ: center[2],
      width: primitive.width / scale.divisor,
      height: primitive.height / scale.divisor,
      depth: primitive.depth / scale.divisor,
      yaw: item.rotation + primitive.yaw,
      color: parseHexColor(primitive.color),
      materialId: materialForFurniture(item),
    });
  }
}

function addCabinet(
  target: number[],
  apartment: Apartment,
  placement: CabinetPlacement,
  scale: SceneScale,
  selected: boolean,
): void {
  const wall = apartment.walls.find((item) => item.id === placement.wallId);
  if (!wall) return;
  const length = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
  if (length <= 0) return;
  const tangentX = (wall.end.x - wall.start.x) / length;
  const tangentZ = (wall.end.y - wall.start.y) / length;
  const inwardX = Math.cos(placement.orientation);
  const inwardZ = Math.sin(placement.orientation);
  const room = apartment.rooms.find((item) => item.id === placement.roomId);
  if (!room) return;
  const origin = placementTransformForRoom(wall, room, placement.distanceFromWallStart);
  const centerX = origin.x + tangentX * (placement.width / 2) + inwardX * (placement.depth / 2);
  const centerZ = origin.y + tangentZ * (placement.width / 2) + inwardZ * (placement.depth / 2);
  const cabinetYaw = Math.atan2(tangentZ, tangentX);
  if (selected) {
    const highlightCenter = localPoint(scale, centerX, 8, centerZ);
    addBox(target, {
      centerX: highlightCenter[0],
      centerY: highlightCenter[1],
      centerZ: highlightCenter[2],
      width: (placement.width + 140) / scale.divisor,
      height: 12 / scale.divisor,
      depth: (placement.depth + 140) / scale.divisor,
      yaw: cabinetYaw,
      color: SELECTION_COLOR,
      materialId: ROOM_MATERIAL_IDS.ceramic,
    });
  }
  const shadowCenter = localPoint(scale, centerX, 4, centerZ);
  addBox(target, {
    centerX: shadowCenter[0],
    centerY: shadowCenter[1],
    centerZ: shadowCenter[2],
    width: (placement.width * 1.03) / scale.divisor,
    height: 8 / scale.divisor,
    depth: (placement.depth * 1.08) / scale.divisor,
    yaw: cabinetYaw,
    color: [0.45, 0.42, 0.38],
    materialId: ROOM_MATERIAL_IDS.shadow,
  });
  const addLocalBox = (
    across: number,
    bottom: number,
    inside: number,
    width: number,
    height: number,
    depth: number,
    color: Color,
    materialId: RoomMaterialId = ROOM_MATERIAL_IDS.wood,
  ) => {
    const center = localPoint(
      scale,
      centerX + tangentX * across + inwardX * inside,
      bottom + height / 2,
      centerZ + tangentZ * across + inwardZ * inside,
    );
    addBox(target, {
      centerX: center[0],
      centerY: center[1],
      centerZ: center[2],
      width: width / scale.divisor,
      height: height / scale.divisor,
      depth: depth / scale.divisor,
      yaw: cabinetYaw,
      color,
      materialId,
    });
  };

  for (const instance of buildPartInstances(placement.cabinetConfig)) {
    const material = resolveMaterial(instance.part);
    if (placement.cabinetConfig.doorStyle === 'shaker' && instance.part.name.en === 'Door') {
      // Visual routing in the same door blank; no added material or changed envelope.
      const [width, height, depth] = instance.size;
      const rail = Math.min(60, width / 4, height / 4);
      const x = instance.center[0] - placement.width / 2;
      const y = placement.elevation + instance.center[1] - height / 2;
      const z = instance.center[2] - placement.depth / 2;
      const color = parseHexColor(material.color);
      for (const side of [-1, 1]) addLocalBox(x + (side * (width - rail)) / 2, y, z, rail, height, depth, color);
      for (const bottom of [y, y + height - rail]) addLocalBox(x, bottom, z, width - 2 * rail, rail, depth, color);
      const recess = Math.min(6, depth / 3);
      addLocalBox(x, y + rail, z - recess / 2, width - 2 * rail, height - 2 * rail, depth - recess, tint(color, 0.96));
      continue;
    }
    addLocalBox(
      instance.center[0] - placement.width / 2,
      placement.elevation + instance.center[1] - instance.size[1] / 2,
      instance.center[2] - placement.depth / 2,
      instance.size[0],
      instance.size[1],
      instance.size[2],
      parseHexColor(material.color),
      instance.part.name.en === 'Glass Door' ? ROOM_MATERIAL_IDS.glass : ROOM_MATERIAL_IDS.wood,
    );
  }
}

export function buildApartmentRoomScene(
  apartment: Apartment,
  room: Room,
  placements: readonly CabinetPlacement[],
  options: ApartmentRoomSceneOptions = {},
): ApartmentRoomScene {
  const vertices: number[] = [];
  const scale = roomScale(room);
  const cameraYaw = options.cameraYaw ?? DEFAULT_ROOM_CAMERA_YAW;
  const voids = apartment.fixedElements.filter(
    (element) => element.roomId === room.id && element.kind === 'balcony-void',
  );
  addFloor(
    vertices,
    room,
    scale,
    voids.map((element) => element.polygon),
  );
  const walls = room.wallIds
    .map((id) => apartment.walls.find((wall) => wall.id === id))
    .filter((wall): wall is Wall => wall !== undefined);
  let cutawayWallCount = 0;
  const cutawayWallIds: string[] = [];
  for (const wall of walls) {
    const isCutaway = isCameraFacingWall(wall, scale, cameraYaw);
    if (isCutaway) {
      cutawayWallCount += 1;
      cutawayWallIds.push(wall.id);
    }
    addWall(vertices, wall, scale, isCutaway ? CUTAWAY_WALL_HEIGHT : undefined);
    if (!isCutaway) addOpeningDetails(vertices, room, wall, scale);
  }
  for (const element of apartment.fixedElements.filter(
    (item) => item.roomId === room.id && item.kind !== 'balcony-void',
  )) {
    addArchitecturalPrism(
      vertices,
      element.polygon,
      element.height ?? room.ceilingHeight ?? DEFAULT_WALL_HEIGHT,
      scale,
    );
  }
  // Fixtures have no verified elevation: show their footprint as a low source marker.
  for (const fixture of (apartment.fixtures ?? []).filter((item) => item.roomId === room.id)) {
    addArchitecturalPrism(vertices, fixture.polygon, 15, scale);
  }
  const objects: NonNullable<ApartmentRoomScene['objects']> = [];
  const cabinets = placements.filter((placement) => placement.roomId === room.id);
  for (const cabinet of cabinets) {
    const startVertex = vertices.length / ROOM_VERTEX_STRIDE;
    addCabinet(vertices, apartment, cabinet, scale, cabinet.id === options.selectedObjectId);
    objects.push({ id: cabinet.id, startVertex, vertexCount: vertices.length / ROOM_VERTEX_STRIDE - startVertex });
  }
  const furniture =
    options.showFurniture === false ? [] : (apartment.furniture ?? []).filter((item) => item.roomId === room.id);
  for (const item of furniture) {
    const startVertex = vertices.length / ROOM_VERTEX_STRIDE;
    addFurniture(vertices, item, options.furniturePalette ?? 'warm', scale, item.id === options.selectedObjectId);
    objects.push({ id: item.id, startVertex, vertexCount: vertices.length / ROOM_VERTEX_STRIDE - startVertex });
  }
  return {
    vertices: new Float32Array(vertices),
    objects,
    vertexStride: ROOM_VERTEX_STRIDE,
    wallCount: walls.length,
    cutawayWallCount,
    cutawayWallIds,
    cabinetCount: cabinets.length,
    furnitureCount: furniture.length,
    bedCount: furniture.filter((item) => item.kind === 'single-bed' || item.kind === 'double-bed').length,
    openingCount: walls.reduce((count, wall) => count + wall.openings.length, 0),
    roomWidth: scale.width,
    roomDepth: scale.depth,
    targetHeight: Math.min(0.72, DEFAULT_WALL_HEIGHT / scale.divisor / 2),
    millimetresPerUnit: scale.divisor,
  };
}
