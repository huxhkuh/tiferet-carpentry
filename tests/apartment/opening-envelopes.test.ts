import { describe, expect, it } from 'vitest';
import { createCabinetPlacement } from '../../src/apartment/cabinet/adapter';
import { TIFERET_5_1 } from '../../src/apartment/data/tiferet';
import { cabinetOpeningEnvelopes } from '../../src/apartment/geometry/opening-envelopes';
import { cabinetUsageWarnings } from '../../src/apartment/geometry/usage-clearance';
import { polygonsOverlap } from '../../src/apartment/geometry/polygon';
import type { Room, Wall, FurniturePlacement } from '../../src/apartment/types';

const wall: Wall = { id: 'north', start: { x: 0, y: 0 }, end: { x: 5000, y: 0 }, openings: [] };
const room: Room = {
  id: 'room',
  name: 'Room',
  wallIds: [wall.id],
  ceilingHeight: 3000,
  polygon: [
    { x: 0, y: 0 },
    { x: 5000, y: 0 },
    { x: 5000, y: 5000 },
    { x: 0, y: 5000 },
  ],
};
const apartment = { ...TIFERET_5_1, rooms: [room], walls: [wall], furniture: [], fixtures: [], fixedElements: [] };
const makeCabinet = (patch = {}) =>
  createCabinetPlacement({
    apartment,
    room,
    wall,
    distanceFromWallStart: 1000,
    cabinetConfig: { width: 1000, height: 2400, depth: 600, ...patch },
  });

describe('assembled cabinet opening envelopes', () => {
  it('does not invent doors on an open bookshelf', () => {
    expect(cabinetOpeningEnvelopes(makeCabinet({ furnitureType: 'bookshelf' }), wall, room)).toEqual([]);
  });

  it('uses individual quarter-circle sweeps, not a full-width rectangular exclusion', () => {
    const envelopes = cabinetOpeningEnvelopes(makeCabinet({ doorCount: 2, drawerCount: 0 }), wall, room);
    expect(envelopes).toHaveLength(2);
    const gap = [
      { x: 1475, y: 1040 },
      { x: 1525, y: 1040 },
      { x: 1525, y: 1100 },
      { x: 1475, y: 1100 },
    ];
    expect(envelopes.some((envelope) => polygonsOverlap(envelope.polygon, gap))).toBe(false);
    expect(envelopes.every((envelope) => envelope.elevation >= 0 && envelope.height > 2000)).toBe(true);
  });

  it('mirrors the assumed hinge side for a single door', () => {
    const normal = cabinetOpeningEnvelopes(makeCabinet({ doorCount: 1 }), wall, room)[0];
    const mirrored = cabinetOpeningEnvelopes(makeCabinet({ doorCount: 1, isMirrored: true }), wall, room)[0];
    expect(normal.polygon[0].x).toBeLessThan(1100);
    expect(mirrored.polygon[0].x).toBeGreaterThan(1900);
  });

  it('checks drawer travel at the drawer height, allowing furniture above it', () => {
    const cabinet = makeCabinet({ doorStyle: 'none', drawerCount: 1 });
    const envelope = cabinetOpeningEnvelopes(cabinet, wall, room)[0];
    expect(envelope.kind).toBe('drawer');
    expect(envelope.height).toBeLessThan(250);
    const obstacle: FurniturePlacement = {
      id: 'obstacle',
      roomId: room.id,
      kind: 'nightstand',
      label: 'test obstacle',
      x: 1300,
      y: 800,
      width: 200,
      depth: 200,
      height: 200,
      elevation: 0,
      rotation: 0,
    };
    expect(
      cabinetUsageWarnings(apartment, cabinet, [cabinet], [obstacle]).some((text) => text.includes(obstacle.label)),
    ).toBe(true);
    expect(
      cabinetUsageWarnings(apartment, cabinet, [cabinet], [{ ...obstacle, elevation: 1500 }]).some((text) =>
        text.includes(obstacle.label),
      ),
    ).toBe(false);
  });
});
