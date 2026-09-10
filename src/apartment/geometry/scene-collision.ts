import type { Apartment, CabinetPlacement, FurnitureKind, FurniturePlacement, Point, Room, Wall } from '../types';
import { furnitureFootprint } from '../furniture/geometry';
import { cabinetFootprint } from './placement-geometry';
import { getUsableWallIntervals, validatePlacement, verticalBoundsOverlap } from './intervals';
import { polygonContainsPolygon, polygonsOverlap } from './polygon';

export interface SceneCollision {
  kind: 'cabinet-furniture' | 'furniture-cabinet' | 'outside-room';
  cabinetId?: string;
  furnitureId?: string;
}

const DEFAULT_VISUAL_FRONT_CLEARANCE = 60;
const DEFAULT_OFFSET_STEP = 10;
const OUTSIDE_ROOM_MESSAGE = 'הריהוט יוצא מגבולות החדר';
const FURNITURE_CABINET_MESSAGE = 'הריהוט חופף לארון קיים';
const FURNITURE_OVERLAP_MESSAGE = 'הריהוט חופף לפריט ריהוט אחר';
const FIXED_ELEMENT_MESSAGE = 'הריהוט חופף לאלמנט קבוע בחדר';
const ARCHITECTURAL_FIXTURE_MESSAGE = 'הריהוט חופף לפריט אדריכלי קבוע';
const IGNORED_FURNITURE_KINDS: readonly FurnitureKind[] = ['rug', 'kitchen-wall-run', 'sink'];
const BLOCKING_FIXED_KINDS = ['shaft', 'column', 'utility', 'balcony-void'] as const;

function dot(point: Point, axis: Point): number {
  return point.x * axis.x + point.y * axis.y;
}

function normalize(axis: Point): Point {
  const length = Math.hypot(axis.x, axis.y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: axis.x / length, y: axis.y / length };
}

function perpendicularAxis(first: Point, second: Point): Point {
  return normalize({ x: -(second.y - first.y), y: second.x - first.x });
}

function projection(points: readonly Point[], axis: Point): { min: number; max: number } {
  const values = points.map((point) => dot(point, axis));
  return { min: Math.min(...values), max: Math.max(...values) };
}

function projectionsOverlap(
  first: { min: number; max: number },
  second: { min: number; max: number },
  tolerance: number,
) {
  return first.max + tolerance > second.min && second.max + tolerance > first.min;
}

function polygonInsideRoom(room: Room, polygon: readonly Point[], tolerance = 0): boolean {
  return polygonContainsPolygon(room.polygon, polygon, tolerance);
}

export function rectangleFootprintsOverlap(first: readonly Point[], second: readonly Point[], tolerance = 0): boolean {
  if (first.length !== 4 || second.length !== 4) return false;
  const axes = [
    perpendicularAxis(first[0], first[1]),
    perpendicularAxis(first[1], first[2]),
    perpendicularAxis(second[0], second[1]),
    perpendicularAxis(second[1], second[2]),
  ];
  return axes.every((axis) => projectionsOverlap(projection(first, axis), projection(second, axis), tolerance));
}

export function visualCabinetFootprint(
  wall: Wall,
  room: Room,
  distanceFromWallStart: number,
  width: number,
  depth: number,
  frontClearance = DEFAULT_VISUAL_FRONT_CLEARANCE,
): Point[] {
  return cabinetFootprint(wall, distanceFromWallStart, width, depth + frontClearance, room);
}

function shouldIgnoreFurniture(item: FurniturePlacement): boolean {
  return IGNORED_FURNITURE_KINDS.includes(item.kind);
}

function cabinetVisualFootprint(apartment: Apartment, room: Room, placement: CabinetPlacement): Point[] | null {
  const wall = apartment.walls.find((candidate) => candidate.id === placement.wallId);
  return wall
    ? visualCabinetFootprint(wall, room, placement.distanceFromWallStart, placement.width, placement.depth)
    : null;
}

export function findCabinetFurnitureCollision(
  room: Room,
  wall: Wall,
  distanceFromWallStart: number,
  width: number,
  depth: number,
  furniture: readonly FurniturePlacement[],
  tolerance = 0,
  elevation = 0,
  height = Infinity,
): SceneCollision | null {
  const cabinet = visualCabinetFootprint(wall, room, distanceFromWallStart, width, depth);
  const collision = furniture
    .filter(
      (item) =>
        item.roomId === room.id &&
        !shouldIgnoreFurniture(item) &&
        verticalBoundsOverlap(elevation, height, item.elevation, item.height),
    )
    .find((item) => rectangleFootprintsOverlap(cabinet, furnitureFootprint(item), tolerance));
  return collision ? { kind: 'cabinet-furniture', furnitureId: collision.id } : null;
}

/** Shared placement boundary for edits, imports, saves and automatic placement. */
export function validateCabinetInRoom(
  apartment: Apartment,
  room: Room,
  wall: Wall,
  cabinet: Pick<CabinetPlacement, 'id' | 'width' | 'depth' | 'height' | 'elevation' | 'distanceFromWallStart'>,
  placements: readonly CabinetPlacement[] = [],
  furniture: readonly FurniturePlacement[] = apartment.furniture ?? [],
): string | null {
  if (
    ![cabinet.width, cabinet.height, cabinet.depth].every((value) => Number.isFinite(value) && value > 0) ||
    !Number.isFinite(cabinet.elevation) ||
    cabinet.elevation < 0
  )
    return 'מידות הארון אינן תקינות';
  const scoped = placements.filter((item) => item.apartmentId === apartment.id && item.roomId === room.id);
  const wallError = validatePlacement(wall, cabinet.width, cabinet.distanceFromWallStart, scoped, cabinet.id, cabinet);
  if (wallError) return wallError;
  const footprint = cabinetFootprint(wall, cabinet.distanceFromWallStart, cabinet.width, cabinet.depth, room);
  if (!polygonInsideRoom(room, footprint)) return 'הארון יוצא מגבולות החדר';
  if (room.ceilingHeight !== undefined && cabinet.elevation + cabinet.height > room.ceilingHeight)
    return 'הארון גבוה מגובה החדר';
  if (
    scoped.some((item) => {
      if (
        item.id === cabinet.id ||
        !verticalBoundsOverlap(cabinet.elevation, cabinet.height, item.elevation, item.height)
      )
        return false;
      const otherWall = apartment.walls.find((candidate) => candidate.id === item.wallId);
      return (
        otherWall &&
        polygonsOverlap(
          footprint,
          cabinetFootprint(otherWall, item.distanceFromWallStart, item.width, item.depth, room),
        )
      );
    })
  )
    return 'הארון חופף לארון קיים בחדר';
  if (
    apartment.fixedElements.some(
      (element) =>
        element.roomId === room.id &&
        verticalBoundsOverlap(cabinet.elevation, cabinet.height, 0, element.height ?? Infinity) &&
        polygonsOverlap(footprint, element.polygon),
    )
  )
    return 'הארון חופף לאלמנט קבוע בחדר';
  if (
    (apartment.fixtures ?? []).some(
      (fixture) => fixture.roomId === room.id && polygonsOverlap(footprint, fixture.polygon),
    )
  )
    return 'הארון חופף לפריט אדריכלי קבוע';
  return findCabinetFurnitureCollision(
    room,
    wall,
    cabinet.distanceFromWallStart,
    cabinet.width,
    cabinet.depth,
    furniture,
    0,
    cabinet.elevation,
    cabinet.height,
  )
    ? 'הארון חופף לריהוט בחדר. הזיזו את הריהוט או בחרו מיקום אחר'
    : null;
}

export function validateFurnitureMove(
  room: Room,
  furniture: FurniturePlacement,
  cabinets: readonly CabinetPlacement[],
  apartment?: Apartment,
  furnitureItems: readonly FurniturePlacement[] = apartment?.furniture ?? [],
): string | null {
  const footprint = furnitureFootprint(furniture);
  if (!polygonInsideRoom(room, footprint)) return OUTSIDE_ROOM_MESSAGE;
  const furnitureOverlap = shouldIgnoreFurniture(furniture)
    ? undefined
    : furnitureItems.find(
        (candidate) =>
          candidate.id !== furniture.id &&
          candidate.roomId === room.id &&
          !shouldIgnoreFurniture(candidate) &&
          verticalBoundsOverlap(furniture.elevation, furniture.height, candidate.elevation, candidate.height) &&
          rectangleFootprintsOverlap(footprint, furnitureFootprint(candidate)),
      );
  if (furnitureOverlap) return FURNITURE_OVERLAP_MESSAGE;
  if (!apartment) return null;
  const fixedElementOverlap = apartment.fixedElements.some(
    (element) =>
      element.roomId === room.id &&
      BLOCKING_FIXED_KINDS.includes(element.kind as (typeof BLOCKING_FIXED_KINDS)[number]) &&
      verticalBoundsOverlap(furniture.elevation, furniture.height, 0, element.height ?? Infinity) &&
      polygonsOverlap(footprint, element.polygon),
  );
  if (fixedElementOverlap) return FIXED_ELEMENT_MESSAGE;
  const fixtureOverlap = !furniture.id.startsWith('scene-')
    ? (apartment.fixtures ?? []).some(
        (fixture) => fixture.roomId === room.id && polygonsOverlap(footprint, fixture.polygon),
      )
    : false;
  if (fixtureOverlap) return ARCHITECTURAL_FIXTURE_MESSAGE;
  const overlap = cabinets.find((cabinet) => {
    if (
      cabinet.roomId !== room.id ||
      !verticalBoundsOverlap(furniture.elevation, furniture.height, cabinet.elevation, cabinet.height)
    )
      return false;
    const cabinetFootprintForRoom = cabinetVisualFootprint(apartment, room, cabinet);
    return cabinetFootprintForRoom ? rectangleFootprintsOverlap(footprint, cabinetFootprintForRoom) : false;
  });
  return overlap ? FURNITURE_CABINET_MESSAGE : null;
}

export function findFirstCollisionFreeCabinetOffset(
  apartment: Apartment,
  room: Room,
  wall: Wall,
  width: number,
  depth: number,
  furniture: readonly FurniturePlacement[] = apartment.furniture ?? [],
  placements: readonly CabinetPlacement[] = [],
  step = DEFAULT_OFFSET_STEP,
  vertical: { elevation: number; height: number } = { elevation: 0, height: Infinity },
): number | null {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(depth) || depth <= 0 || step <= 0) return null;
  for (const segment of getUsableWallIntervals(wall, { placements, ...vertical })) {
    for (let offset = segment.start; offset + width <= segment.end; offset += step) {
      if (
        validateCabinetInRoom(
          apartment,
          room,
          wall,
          {
            id: '',
            width,
            depth,
            height: Number.isFinite(vertical.height)
              ? vertical.height
              : (room.ceilingHeight ?? wall.height ?? Number.MAX_SAFE_INTEGER),
            elevation: vertical.elevation,
            distanceFromWallStart: offset,
          },
          placements,
          furniture,
        ) === null
      )
        return offset;
    }
  }
  return null;
}
