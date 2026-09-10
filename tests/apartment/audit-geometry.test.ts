import { describe, expect, it } from 'vitest';
import { createCabinetPlacement } from '../../src/apartment/cabinet/adapter';
import {
  polygonContainsPolygon,
  triangulatePolygon,
  triangulatePolygonWithHoles,
  polygonsOverlap,
} from '../../src/apartment/geometry/polygon';
import { TIFERET_5_1 } from '../../src/apartment/data/tiferet';
import type { Apartment, Point, Room, Wall } from '../../src/apartment/types';

const rectangle = (x: number, y: number, width: number, depth: number): Point[] => [
  { x, y },
  { x: x + width, y },
  { x: x + width, y: y + depth },
  { x, y: y + depth },
];
const walls: Wall[] = [
  { id: 'north', start: { x: 0, y: 0 }, end: { x: 3000, y: 0 }, openings: [] },
  { id: 'west', start: { x: 0, y: 0 }, end: { x: 0, y: 3000 }, openings: [] },
];
const room: Room = { id: 'room', name: 'Room', polygon: rectangle(0, 0, 3000, 3000), wallIds: ['north', 'west'] };
const apartment: Apartment = {
  ...TIFERET_5_1,
  id: 'audit',
  rooms: [room],
  walls,
  furniture: [],
  fixtures: [],
  fixedElements: [],
  wallMasses: [],
};
const cabinetConfig = { width: 1000, height: 2000, depth: 600 };

describe('audit geometry regressions', () => {
  it('places cabinets at the room-facing surface of a wall measured by its centreline', () => {
    const wall: Wall = {
      ...walls[0],
      thickness: 150,
      measurements: { length: { origin: 'derived', basis: 'centerline', confidence: 'medium' } },
    };
    const importedRoom = { ...room, polygon: rectangle(0, 75, 3000, 2925) };
    const imported = { ...apartment, walls: [wall], rooms: [importedRoom] };
    expect(() =>
      createCabinetPlacement({
        apartment: imported,
        room: importedRoom,
        wall,
        cabinetConfig,
        distanceFromWallStart: 100,
      }),
    ).not.toThrow();
  });
  it('leaves real holes in the floor without overlapping triangles', () => {
    const boundary = rectangle(0, 0, 3000, 3000);
    const holes = [rectangle(1000, 1000, 600, 800), rectangle(2300, 0, 400, 300)];
    const triangles = triangulatePolygonWithHoles(boundary, holes);
    const area = triangles.reduce(
      (sum, [a, b, c]) => sum + Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2,
      0,
    );
    expect(area).toBeCloseTo(3000 * 3000 - 600 * 800 - 400 * 300, 4);
    for (const triangle of triangles) {
      expect(polygonContainsPolygon(boundary, triangle)).toBe(true);
      expect(holes.some((hole) => polygonsOverlap(triangle, hole))).toBe(false);
    }
  });
  it('rejects a rectangle crossing a notch even when every corner is inside', () => {
    const uShape = [
      { x: 0, y: 0 },
      { x: 3000, y: 0 },
      { x: 3000, y: 3000 },
      { x: 2000, y: 3000 },
      { x: 2000, y: 1000 },
      { x: 1000, y: 1000 },
      { x: 1000, y: 3000 },
      { x: 0, y: 3000 },
    ];
    expect(polygonContainsPolygon(uShape, rectangle(500, 500, 2000, 2000))).toBe(false);
    expect(polygonContainsPolygon(uShape, rectangle(0, 0, 1000, 3000))).toBe(true);
    const area = triangulatePolygon(uShape).reduce(
      (sum, [a, b, c]) => sum + Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2,
      0,
    );
    expect(area).toBe(7_000_000);
  });

  it('rejects perpendicular cabinets occupying the same corner and finds an alternate offset', () => {
    const first = createCabinetPlacement({
      apartment,
      room,
      wall: walls[0],
      cabinetConfig,
      distanceFromWallStart: 0,
      id: 'first',
    });
    expect(() =>
      createCabinetPlacement({
        apartment,
        room,
        wall: walls[1],
        cabinetConfig,
        distanceFromWallStart: 0,
        existingPlacements: [first],
      }),
    ).toThrow(/חופף/);
    const second = createCabinetPlacement({
      apartment,
      room,
      wall: walls[1],
      cabinetConfig,
      existingPlacements: [first],
    });
    expect(second.distanceFromWallStart).toBeGreaterThanOrEqual(600);
  });

  it('rejects cabinet depth outside a room, including automatic placement', () => {
    const narrow = { ...room, polygon: rectangle(0, 0, 3000, 400) };
    for (const distanceFromWallStart of [0, undefined])
      expect(() =>
        createCabinetPlacement({
          apartment: { ...apartment, rooms: [narrow] },
          room: narrow,
          wall: walls[0],
          cabinetConfig,
          distanceFromWallStart,
        }),
      ).toThrow();
  });

  it('allows a cabinet below a window only when its vertical bounds are known', () => {
    const wall: Wall = {
      ...walls[0],
      openings: [{ id: 'window', kind: 'window', offset: 0, width: 1500, sillHeight: 1200, height: 800 }],
    };
    const input = {
      apartment: { ...apartment, walls: [wall, walls[1]] },
      room,
      wall,
      cabinetConfig: { ...cabinetConfig, height: 900 },
      distanceFromWallStart: 0,
    };
    expect(() => createCabinetPlacement(input)).not.toThrow();
    expect(() => createCabinetPlacement({ ...input, cabinetConfig })).toThrow(/פתח/);
  });
});
