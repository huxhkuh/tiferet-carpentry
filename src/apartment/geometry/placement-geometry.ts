import type { Point, Room, Wall } from '../types';
import { pointAlongWall, wallFrame } from './wall-frame';

export interface PlacementTransform {
  x: number;
  y: number;
  orientation: number;
}

export function placementTransform(wall: Wall, distanceFromWallStart: number): PlacementTransform {
  const point = pointAlongWall(wall, distanceFromWallStart);
  return { ...point, orientation: wallFrame(wall).inwardOrientation };
}

export function placementTransformForRoom(wall: Wall, room: Room, distanceFromWallStart: number): PlacementTransform {
  const point = pointAlongWall(wall, distanceFromWallStart);
  return { ...point, orientation: wallFrame(wall, room).inwardOrientation };
}

export function cabinetFootprint(
  wall: Wall,
  distanceFromWallStart: number,
  width: number,
  depth: number,
  room?: Room,
): Point[] {
  const frame = wallFrame(wall, room);
  const first = pointAlongWall(wall, distanceFromWallStart);
  const second = {
    x: first.x + frame.tangent.x * width,
    y: first.y + frame.tangent.y * width,
  };
  const third = {
    x: second.x + frame.inwardNormal.x * depth,
    y: second.y + frame.inwardNormal.y * depth,
  };
  const fourth = {
    x: first.x + frame.inwardNormal.x * depth,
    y: first.y + frame.inwardNormal.y * depth,
  };
  return [first, second, third, fourth];
}
