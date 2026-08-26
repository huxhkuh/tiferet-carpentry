import type { Point, Room, Wall } from '../types';

export interface UnitVector {
  x: number;
  y: number;
}

export interface WallFrame {
  origin: Point;
  tangent: UnitVector;
  inwardNormal: UnitVector;
  wallAngle: number;
  inwardOrientation: number;
}

const GEOMETRY_EPSILON = 1e-7;

export const wallLength = (wall: Wall): number => Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);

export const wallAngle = (wall: Wall): number => Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);

export function wallTangent(wall: Wall): UnitVector {
  const length = wallLength(wall);
  if (!Number.isFinite(length) || length <= GEOMETRY_EPSILON) {
    throw new RangeError('לא ניתן לחשב כיוון לקיר שאורכו אפס');
  }
  return {
    x: (wall.end.x - wall.start.x) / length,
    y: (wall.end.y - wall.start.y) / length,
  };
}

export function pointInPolygon(point: Point, polygon: readonly Point[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const intersects =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) / (previousPoint.y - currentPoint.y) +
          currentPoint.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function polygonCentroid(polygon: readonly Point[]): Point {
  let twiceArea = 0;
  let xTotal = 0;
  let yTotal = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    const cross = current.x * next.y - next.x * current.y;
    twiceArea += cross;
    xTotal += (current.x + next.x) * cross;
    yTotal += (current.y + next.y) * cross;
  }
  if (Math.abs(twiceArea) <= GEOMETRY_EPSILON) {
    const total = polygon.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
    return polygon.length === 0 ? { x: 0, y: 0 } : { x: total.x / polygon.length, y: total.y / polygon.length };
  }
  return {
    x: xTotal / (3 * twiceArea),
    y: yTotal / (3 * twiceArea),
  };
}

export function inwardNormalForRoom(wall: Wall, room: Room): UnitVector {
  const tangent = wallTangent(wall);
  const left = { x: -tangent.y, y: tangent.x };
  const right = { x: tangent.y, y: -tangent.x };
  const middle = {
    x: (wall.start.x + wall.end.x) / 2,
    y: (wall.start.y + wall.end.y) / 2,
  };
  const sampleDistance = Math.max(1, Math.min(25, wallLength(wall) * 0.01));
  const leftIsInside = pointInPolygon(
    { x: middle.x + left.x * sampleDistance, y: middle.y + left.y * sampleDistance },
    room.polygon,
  );
  const rightIsInside = pointInPolygon(
    { x: middle.x + right.x * sampleDistance, y: middle.y + right.y * sampleDistance },
    room.polygon,
  );
  if (leftIsInside !== rightIsInside) return leftIsInside ? left : right;

  const centroid = polygonCentroid(room.polygon);
  const leftDot = left.x * (centroid.x - middle.x) + left.y * (centroid.y - middle.y);
  return leftDot >= 0 ? left : right;
}

export function wallFrame(wall: Wall, room?: Room): WallFrame {
  const tangent = wallTangent(wall);
  const inwardNormal = room ? inwardNormalForRoom(wall, room) : { x: -tangent.y, y: tangent.x };
  return {
    origin: { ...wall.start },
    tangent,
    inwardNormal,
    wallAngle: Math.atan2(tangent.y, tangent.x),
    inwardOrientation: Math.atan2(inwardNormal.y, inwardNormal.x),
  };
}

export function pointAlongWall(wall: Wall, distanceFromWallStart: number): Point {
  const frame = wallFrame(wall);
  return {
    x: frame.origin.x + frame.tangent.x * distanceFromWallStart,
    y: frame.origin.y + frame.tangent.y * distanceFromWallStart,
  };
}
