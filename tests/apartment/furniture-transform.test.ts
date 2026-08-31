import { describe, expect, it } from 'vitest';

import {
  resizeFurniture,
  rotateFurniture,
  snapFurnitureToGrid,
  snapFurnitureToNearestWall,
} from '../../src/apartment/furniture/transform';
import type { Apartment, FurniturePlacement, Room, Wall } from '../../src/apartment/types';

const ROOM: Room = {
  id: 'room',
  name: 'חדר',
  wallIds: ['north', 'east', 'south', 'west'],
  polygon: [
    { x: 0, y: 0 },
    { x: 4_000, y: 0 },
    { x: 4_000, y: 3_000 },
    { x: 0, y: 3_000 },
  ],
};

const WALLS: Wall[] = [
  { id: 'north', start: { x: 0, y: 0 }, end: { x: 4_000, y: 0 }, thickness: 120, openings: [] },
  { id: 'east', start: { x: 4_000, y: 0 }, end: { x: 4_000, y: 3_000 }, thickness: 120, openings: [] },
  { id: 'south', start: { x: 4_000, y: 3_000 }, end: { x: 0, y: 3_000 }, thickness: 120, openings: [] },
  { id: 'west', start: { x: 0, y: 3_000 }, end: { x: 0, y: 0 }, thickness: 120, openings: [] },
];

const APARTMENT: Apartment = {
  id: 'apartment',
  name: 'דירה',
  type: 'בדיקה',
  rooms: [ROOM],
  walls: WALLS,
  fixedElements: [],
  source: { project: 'בדיקה', building: 'בדיקה', floor: 1, sheet: '1', sourceType: 'sales-plan-pdf' },
};

const DESK: FurniturePlacement = {
  id: 'desk',
  roomId: ROOM.id,
  kind: 'desk',
  label: 'שולחן כתיבה',
  x: 2_033,
  y: 288,
  width: 1_100,
  depth: 550,
  height: 750,
  elevation: 0,
  rotation: 0,
};

describe('furniture transform engine', () => {
  it('resizes within catalogue limits without mutating the source item', () => {
    const resized = resizeFurniture(DESK, { width: 1_600, depth: 720, height: 820 });

    expect(resized).toMatchObject({ width: 1_600, depth: 720, height: 820 });
    expect(DESK).toMatchObject({ width: 1_100, depth: 550, height: 750 });
    expect(resizeFurniture(DESK, { width: 10, depth: 20, height: 30 })).toMatchObject({
      width: 550,
      depth: 275,
      height: 375,
    });
  });

  it('normalizes rotation and snaps position to a configurable metric grid', () => {
    expect(rotateFurniture(DESK, Math.PI * 5)).toMatchObject({ rotation: -Math.PI });
    expect(snapFurnitureToGrid(DESK, 50)).toMatchObject({ x: 2_050, y: 300 });
  });

  it('snaps a nearby item parallel to the closest wall and into the room', () => {
    const snapped = snapFurnitureToNearestWall(APARTMENT, ROOM, DESK, 400);

    expect(snapped).toMatchObject({ x: 2_033, y: DESK.depth / 2 + 20, rotation: 0 });
    expect(DESK.y).toBe(288);
  });

  it('leaves an item unchanged when no wall is within the snap tolerance', () => {
    const centred = { ...DESK, x: 2_000, y: 1_500 };

    expect(snapFurnitureToNearestWall(APARTMENT, ROOM, centred, 200)).toBe(centred);
  });
});
