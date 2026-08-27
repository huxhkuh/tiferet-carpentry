import type { Apartment, CabinetPlacement, FurnitureKind, FurniturePlacement, Point, Room, Wall } from '../types';
import { furnitureFootprint } from '../furniture/geometry';
import { cabinetFootprint } from './placement-geometry';
import { getUsableWallIntervals } from './intervals';

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
const IGNORED_FURNITURE_KINDS: readonly FurnitureKind[] = [
  'rug',
  'kitchen-base-run',
  'kitchen-wall-run',
  'refrigerator',
  'oven',
  'sink',
];

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

function pointOnSegment(point: Point, first: Point, second: Point, tolerance: number): boolean {
  const cross = (point.y - first.y) * (second.x - first.x) - (point.x - first.x) * (second.y - first.y);
  if (Math.abs(cross) > tolerance) return false;
  const dotProduct = (point.x - first.x) * (second.x - first.x) + (point.y - first.y) * (second.y - first.y);
  if (dotProduct < -tolerance) return false;
  const squaredLength = (second.x - first.x) ** 2 + (second.y - first.y) ** 2;
  return dotProduct <= squaredLength + tolerance;
}

export function pointInsideOrOnPolygon(point: Point, polygon: readonly Point[], tolerance = 0): boolean {
  if (polygon.length < 3) return false;
  if (
    polygon.some((candidate, index) =>
      pointOnSegment(point, candidate, polygon[(index + 1) % polygon.length], tolerance),
    )
  ) {
    return true;
  }
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const current = polygon[index];
    const last = polygon[previous];
    const crosses = current.y > point.y !== last.y > point.y;
    if (!crosses) continue;
    const x = ((last.x - current.x) * (point.y - current.y)) / (last.y - current.y) + current.x;
    if (point.x < x) inside = !inside;
  }
  return inside;
}

export function polygonInsideRoom(room: Room, polygon: readonly Point[], tolerance = 0): boolean {
  return polygon.length > 0 && polygon.every((point) => pointInsideOrOnPolygon(point, room.polygon, tolerance));
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
): SceneCollision | null {
  const cabinet = visualCabinetFootprint(wall, room, distanceFromWallStart, width, depth);
  const collision = furniture
    .filter((item) => item.roomId === room.id && !shouldIgnoreFurniture(item))
    .find((item) => rectangleFootprintsOverlap(cabinet, furnitureFootprint(item), tolerance));
  return collision ? { kind: 'cabinet-furniture', furnitureId: collision.id } : null;
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
          rectangleFootprintsOverlap(footprint, furnitureFootprint(candidate)),
      );
  if (furnitureOverlap) return FURNITURE_OVERLAP_MESSAGE;
  if (!apartment) return null;
  const overlap = cabinets.find((cabinet) => {
    if (cabinet.roomId !== room.id) return false;
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
): number | null {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(depth) || depth <= 0 || step <= 0) return null;
  for (const segment of getUsableWallIntervals(wall, { placements })) {
    for (let offset = segment.start; offset + width <= segment.end; offset += step) {
      if (findCabinetFurnitureCollision(room, wall, offset, width, depth, furniture) === null) return offset;
    }
  }
  return null;
}
