import { getMaterial } from '../../engine/materials';
import type { Apartment, CabinetPlacement, FurniturePalette, FurniturePlacement, Opening, Room, Wall } from '../types';
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
const HANDLE_COLOR: Color = [0.2, 0.17, 0.14];
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

function addFloor(target: number[], room: Room, scale: SceneScale): void {
  if (room.polygon.length < 3) return;
  const first = room.polygon[0];
  for (let index = 1; index < room.polygon.length - 1; index += 1) {
    const second = room.polygon[index];
    const third = room.polygon[index + 1];
    for (const point of [first, second, third]) {
      pushVertex(target, localPoint(scale, point.x, -12, point.y), [0, 1, 0], FLOOR_COLOR, ROOM_MATERIAL_IDS.floor);
    }
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
  const centerX =
    wall.start.x + tangentX * (placement.distanceFromWallStart + placement.width / 2) + inwardX * (placement.depth / 2);
  const centerZ =
    wall.start.y + tangentZ * (placement.distanceFromWallStart + placement.width / 2) + inwardZ * (placement.depth / 2);
  const cabinetYaw = Math.atan2(tangentZ, tangentX);
  const cabinetColor = parseHexColor(getMaterial(placement.cabinetConfig.carcassMaterial).color);
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

  const panelThickness = Math.max(24, Math.min(36, placement.width * 0.018));
  const innerWidth = Math.max(40, placement.width - panelThickness * 2);
  const innerHeight = Math.max(40, placement.height - panelThickness * 2);
  addLocalBox(
    -placement.width / 2 + panelThickness / 2,
    placement.elevation,
    0,
    panelThickness,
    placement.height,
    placement.depth,
    tint(cabinetColor, 0.88),
  );
  addLocalBox(
    placement.width / 2 - panelThickness / 2,
    placement.elevation,
    0,
    panelThickness,
    placement.height,
    placement.depth,
    tint(cabinetColor, 0.94),
  );
  addLocalBox(0, placement.elevation, 0, innerWidth, panelThickness, placement.depth, tint(cabinetColor, 0.82));
  addLocalBox(
    0,
    placement.elevation + placement.height - panelThickness,
    0,
    innerWidth,
    panelThickness,
    placement.depth,
    tint(cabinetColor, 1.08),
  );
  addLocalBox(
    0,
    placement.elevation + panelThickness,
    -placement.depth / 2 + 10,
    innerWidth,
    innerHeight,
    20,
    tint(cabinetColor, 0.76),
  );
  const shelfCount = Math.max(0, placement.cabinetConfig.shelfCount);
  for (let index = 0; index < shelfCount; index += 1) {
    addLocalBox(
      0,
      placement.elevation + (innerHeight / (shelfCount + 1)) * (index + 1),
      0,
      innerWidth,
      24,
      placement.depth - 35,
      tint(cabinetColor, 0.98),
    );
  }

  const doorCount = Math.max(1, placement.cabinetConfig.doorCount);
  const gap = 8;
  const drawerCount = Math.max(0, placement.cabinetConfig.drawerCount);
  const drawerZone = drawerCount > 0 ? placement.height * 0.34 : 0;
  const doorHeight = placement.height - drawerZone - gap;
  const doorWidth = Math.max(20, placement.width / doorCount - gap);
  const front = placement.depth / 2 + 10;
  if (placement.cabinetConfig.doorStyle !== 'none') {
    for (let index = 0; index < doorCount; index += 1) {
      const across = -placement.width / 2 + doorWidth / 2 + index * (placement.width / doorCount);
      const bottom = placement.elevation + drawerZone + gap;
      if (placement.cabinetConfig.doorStyle === 'flat') {
        addLocalBox(across, bottom, front, doorWidth, doorHeight, 20, tint(cabinetColor, 1.07));
      } else {
        const frame = Math.min(95, doorWidth * 0.16, doorHeight * 0.12);
        const centreColor = placement.cabinetConfig.doorStyle === 'glass' ? GLASS_COLOR : tint(cabinetColor, 0.88);
        addLocalBox(
          across,
          bottom + frame,
          front,
          doorWidth - frame * 2,
          doorHeight - frame * 2,
          16,
          centreColor,
          placement.cabinetConfig.doorStyle === 'glass' ? ROOM_MATERIAL_IDS.glass : ROOM_MATERIAL_IDS.wood,
        );
        addLocalBox(across - doorWidth / 2 + frame / 2, bottom, front + 4, frame, doorHeight, 24, cabinetColor);
        addLocalBox(across + doorWidth / 2 - frame / 2, bottom, front + 4, frame, doorHeight, 24, cabinetColor);
        addLocalBox(across, bottom, front + 4, doorWidth - frame * 2, frame, 24, tint(cabinetColor, 1.08));
        addLocalBox(
          across,
          bottom + doorHeight - frame,
          front + 4,
          doorWidth - frame * 2,
          frame,
          24,
          tint(cabinetColor, 1.08),
        );
      }
      if (placement.cabinetConfig.handleStyle !== 'none') {
        const handleAcross = across + (index === 0 ? doorWidth * 0.3 : -doorWidth * 0.3);
        const handleWidth =
          placement.cabinetConfig.handleStyle === 'cup'
            ? 110
            : placement.cabinetConfig.handleStyle === 'knob'
              ? 48
              : 20;
        const handleHeight = placement.cabinetConfig.handleStyle === 'bar' ? Math.min(190, doorHeight * 0.2) : 48;
        addLocalBox(
          handleAcross,
          bottom + doorHeight * 0.5 - handleHeight / 2,
          front + 28,
          handleWidth,
          handleHeight,
          34,
          HANDLE_COLOR,
          ROOM_MATERIAL_IDS.metal,
        );
      }
    }
  }

  if (drawerCount > 0) {
    const drawerHeight = drawerZone / drawerCount;
    for (let index = 0; index < drawerCount; index += 1) {
      addLocalBox(
        0,
        placement.elevation + drawerHeight * index,
        front,
        placement.width - gap,
        Math.max(20, drawerHeight - gap),
        20,
        tint(cabinetColor, 1.03),
      );
    }
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
  addFloor(vertices, room, scale);
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
  const cabinets = placements.filter((placement) => placement.roomId === room.id);
  for (const cabinet of cabinets) {
    addCabinet(vertices, apartment, cabinet, scale, cabinet.id === options.selectedObjectId);
  }
  const furniture =
    options.showFurniture === false ? [] : (apartment.furniture ?? []).filter((item) => item.roomId === room.id);
  for (const item of furniture) {
    addFurniture(vertices, item, options.furniturePalette ?? 'warm', scale, item.id === options.selectedObjectId);
  }
  return {
    vertices: new Float32Array(vertices),
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
  };
}
