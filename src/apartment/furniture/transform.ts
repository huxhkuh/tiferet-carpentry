import type { Apartment, FurniturePlacement, Room, Wall } from '../types';
import { inwardNormalForRoom, wallAngle } from '../geometry/wall-frame';
import { FURNITURE_CATALOG } from './catalog';

export interface FurnitureSizePatch {
  width?: number;
  depth?: number;
  height?: number;
}

const FULL_ROTATION = Math.PI * 2;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeRadians(radians: number): number {
  return ((((radians + Math.PI) % FULL_ROTATION) + FULL_ROTATION) % FULL_ROTATION) - Math.PI;
}

export function resizeFurniture(item: FurniturePlacement, patch: FurnitureSizePatch): FurniturePlacement {
  const definition = FURNITURE_CATALOG[item.kind];
  return {
    ...item,
    width: clamp(patch.width ?? item.width, definition.width * 0.5, definition.width * 3),
    depth: clamp(patch.depth ?? item.depth, definition.depth * 0.5, definition.depth * 3),
    height: clamp(patch.height ?? item.height, definition.height * 0.5, definition.height * 3),
  };
}

export function rotateFurniture(item: FurniturePlacement, radians: number): FurniturePlacement {
  return { ...item, rotation: normalizeRadians(radians) };
}

export function snapFurnitureToGrid(item: FurniturePlacement, step = 50): FurniturePlacement {
  if (!Number.isFinite(step) || step <= 0) throw new RangeError('מרווח רשת חייב להיות מספר חיובי');
  return {
    ...item,
    x: Math.round(item.x / step) * step,
    y: Math.round(item.y / step) * step,
  };
}

interface WallProjection {
  wall: Wall;
  x: number;
  y: number;
  distance: number;
}

function projectToWall(wall: Wall, x: number, y: number): WallProjection | null {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const squaredLength = dx * dx + dy * dy;
  if (squaredLength === 0) return null;
  const ratio = clamp(((x - wall.start.x) * dx + (y - wall.start.y) * dy) / squaredLength, 0, 1);
  const projectedX = wall.start.x + dx * ratio;
  const projectedY = wall.start.y + dy * ratio;
  return {
    wall,
    x: projectedX,
    y: projectedY,
    distance: Math.hypot(x - projectedX, y - projectedY),
  };
}

export function snapFurnitureToNearestWall(
  apartment: Apartment,
  room: Room,
  item: FurniturePlacement,
  tolerance = 300,
): FurniturePlacement {
  const closest = room.wallIds
    .map((wallId) => apartment.walls.find((wall) => wall.id === wallId))
    .filter((wall): wall is Wall => wall !== undefined)
    .map((wall) => projectToWall(wall, item.x, item.y))
    .filter((projection): projection is WallProjection => projection !== null)
    .sort((left, right) => left.distance - right.distance)[0];
  if (!closest || closest.distance > tolerance) return item;
  const inward = inwardNormalForRoom(closest.wall, room);
  const offset = item.depth / 2 + 20;
  return {
    ...item,
    x: Math.round(closest.x + inward.x * offset),
    y: Math.round(closest.y + inward.y * offset),
    rotation: normalizeRadians(wallAngle(closest.wall)),
  };
}
