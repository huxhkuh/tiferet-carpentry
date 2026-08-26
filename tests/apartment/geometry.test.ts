import { describe, expect, it } from 'vitest';
import {
  cabinetFootprint,
  findFirstFit,
  findWall,
  getUsableWallIntervals,
  inwardNormalForRoom,
  placementTransformForRoom,
  pointInPolygon,
  polygonCentroid,
  validatePlacement,
  wallFrame,
} from '../../src/apartment/geometry/placement';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import type { CabinetPlacement, Room, Wall } from '../../src/apartment/types';

const room: Room = {
  id: 'room',
  name: 'חדר',
  polygon: [
    { x: 0, y: 0 },
    { x: 4000, y: 0 },
    { x: 4000, y: 3000 },
    { x: 0, y: 3000 },
  ],
  wallIds: ['north'],
};

const northWall: Wall = {
  id: 'north',
  start: { x: 4000, y: 0 },
  end: { x: 0, y: 0 },
  openings: [],
};

const intervalWall: Wall = {
  id: 'interval-wall',
  start: { x: 0, y: 0 },
  end: { x: 4000, y: 0 },
  openings: [
    { id: 'door', kind: 'door', offset: 500, width: 500 },
    { id: 'overlapping-window', kind: 'window', offset: 900, width: 400 },
    { id: 'window', kind: 'window', offset: 2500, width: 500 },
  ],
};

const existingPlacement: CabinetPlacement = {
  id: 'existing',
  apartmentId: 'apartment',
  roomId: 'room',
  wallId: intervalWall.id,
  distanceFromWallStart: 1500,
  elevation: 0,
  orientation: Math.PI / 2,
  width: 500,
  height: 2100,
  depth: 600,
  cabinetConfig: {
    ...DEFAULT_CONFIG,
    furnitureType: 'wardrobe',
    width: 500,
    height: 2100,
    depth: 600,
    lang: 'he',
  },
};

describe('wall-local coordinate frame', () => {
  it('finds the inward normal independently of wall endpoint order', () => {
    expect(inwardNormalForRoom(northWall, room)).toEqual({ x: 0, y: 1 });
    expect(placementTransformForRoom(northWall, room, 500)).toMatchObject({
      x: 3500,
      y: 0,
      orientation: Math.PI / 2,
    });
  });

  it('uses the same inward frame for placement transform and cabinet footprint', () => {
    const frame = wallFrame(northWall, room);
    const transform = placementTransformForRoom(northWall, room, 500);
    const footprint = cabinetFootprint(northWall, 500, 1000, 600, room);

    expect(transform.orientation).toBeCloseTo(frame.inwardOrientation);
    expect(footprint).toEqual([
      { x: 3500, y: 0 },
      { x: 2500, y: 0 },
      { x: 2500, y: 600 },
      { x: 3500, y: 600 },
    ]);
  });

  it('handles polygon helpers and rejects a zero-length wall', () => {
    expect(pointInPolygon({ x: 100, y: 100 }, room.polygon)).toBe(true);
    expect(pointInPolygon({ x: 5000, y: 100 }, room.polygon)).toBe(false);
    expect(polygonCentroid(room.polygon)).toEqual({ x: 2000, y: 1500 });
    expect(polygonCentroid([])).toEqual({ x: 0, y: 0 });
    expect(() => wallFrame({ id: 'zero', start: { x: 1, y: 1 }, end: { x: 1, y: 1 }, openings: [] })).toThrow(
      /אורכו אפס/,
    );
  });

  it('falls back to the polygon centroid when the supplied wall is not on its boundary', () => {
    const detachedWall: Wall = {
      id: 'detached',
      start: { x: 0, y: -500 },
      end: { x: 4000, y: -500 },
      openings: [],
    };

    const normal = inwardNormalForRoom(detachedWall, room);
    expect(normal.x).toBeCloseTo(0);
    expect(normal.y).toBe(1);
  });
});

describe('usable wall intervals', () => {
  it('merges overlapping openings and subtracts existing cabinets', () => {
    expect(getUsableWallIntervals(intervalWall, { placements: [existingPlacement] })).toEqual([
      { start: 0, end: 500 },
      { start: 1300, end: 1500 },
      { start: 2000, end: 2500 },
      { start: 3000, end: 4000 },
    ]);
  });

  it('finds the first segment that can contain the cabinet', () => {
    expect(findFirstFit(intervalWall, 900, { placements: [existingPlacement] })).toBe(3000);
    expect(findFirstFit(intervalWall, 1100, { placements: [existingPlacement] })).toBeNull();
  });

  it('allows adjacent cabinets but rejects intersecting footprints', () => {
    expect(validatePlacement(intervalWall, 200, 1300, [existingPlacement])).toBeNull();
    expect(validatePlacement(intervalWall, 201, 1300, [existingPlacement])).toBe('מיקום הארון חופף לארון קיים');
  });

  it('finds the wall referenced by a persisted placement', () => {
    const apartment = {
      id: 'apartment',
      name: 'דירה',
      type: 'type',
      rooms: [room],
      walls: [intervalWall],
      fixedElements: [],
      source: {
        project: 'project',
        building: 'building',
        floor: 1,
        sheet: '1',
        sourceType: 'sales-plan-pdf' as const,
      },
    };

    expect(findWall(apartment, existingPlacement)).toBe(intervalWall);
  });
});
