import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { TIFERET_5_1 } from '../../src/apartment/data/tiferet';
import type { CabinetPlacement, FurniturePlacement, Room, Wall } from '../../src/apartment/types';
import {
  findCabinetFurnitureCollision,
  findFirstCollisionFreeCabinetOffset,
  rectangleFootprintsOverlap,
  validateFurnitureMove,
  visualCabinetFootprint,
} from '../../src/apartment/geometry/scene-collision';

function requireRoom(id: string): Room {
  const room = TIFERET_5_1.rooms.find((candidate) => candidate.id === id);
  if (!room) throw new Error(`Missing room ${id}`);
  return room;
}

function requireWall(id: string): Wall {
  const wall = TIFERET_5_1.walls.find((candidate) => candidate.id === id);
  if (!wall) throw new Error(`Missing wall ${id}`);
  return wall;
}

function cabinetPlacement(overrides: Partial<CabinetPlacement> = {}): CabinetPlacement {
  return {
    id: 'cabinet',
    apartmentId: TIFERET_5_1.id,
    roomId: 'bedroom',
    wallId: 'bed-e',
    distanceFromWallStart: 0,
    elevation: 0,
    orientation: Math.PI,
    width: 1_800,
    depth: 600,
    height: 2_400,
    cabinetConfig: {
      ...DEFAULT_CONFIG,
      furnitureType: 'wardrobe',
      width: 1_800,
      depth: 600,
      height: 2_400,
    },
    ...overrides,
  };
}

describe('scene collision geometry', () => {
  it('keeps touching rectangles collision-free when tolerance is zero', () => {
    const first = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    const second = [
      { x: 100, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 100 },
      { x: 100, y: 100 },
    ];

    expect(rectangleFootprintsOverlap(first, second)).toBe(false);
    expect(rectangleFootprintsOverlap(first, second, 1)).toBe(true);
  });

  it('extends the visual cabinet footprint forward for doors and handles', () => {
    const bedroom = requireRoom('bedroom');
    const wall = requireWall('bed-e');
    const footprint = visualCabinetFootprint(wall, bedroom, 0, 1_800, 600);

    expect(Math.min(...footprint.map((point) => point.x))).toBe(5_284);
    expect(Math.max(...footprint.map((point) => point.x))).toBe(5_944);
  });

  it('keeps an east-wall wardrobe collision-free from the two separate beds', () => {
    const bedroom = requireRoom('bedroom');
    const wall = requireWall('bed-e');
    const beds = (TIFERET_5_1.furniture ?? []).filter(
      (item) => item.roomId === 'bedroom' && item.kind === 'single-bed',
    );

    expect(findFirstCollisionFreeCabinetOffset(TIFERET_5_1, bedroom, wall, 1_800, 600, beds)).toBe(0);
  });

  it('detects cabinet collision with a movable bed footprint', () => {
    const bedroom = requireRoom('bedroom');
    const wall = requireWall('bed-e');
    const movedBed: FurniturePlacement = {
      id: 'moved-bed',
      roomId: 'bedroom',
      kind: 'single-bed',
      label: 'מיטת יחיד',
      x: 5_600,
      y: 900,
      width: 800,
      depth: 1_500,
      height: 900,
      elevation: 0,
      rotation: 0,
    };

    expect(findCabinetFurnitureCollision(bedroom, wall, 0, 1_800, 600, [movedBed])).toEqual({
      kind: 'cabinet-furniture',
      furnitureId: 'moved-bed',
    });
  });

  it('finds an alternate cabinet offset after an existing cabinet occupies the first usable wall segment', () => {
    const bedroom = requireRoom('bedroom');
    const wall = requireWall('bed-s');
    const offset = findFirstCollisionFreeCabinetOffset(
      TIFERET_5_1,
      bedroom,
      wall,
      600,
      450,
      [],
      [cabinetPlacement({ id: 'existing', wallId: 'bed-s', distanceFromWallStart: 980, width: 1_100 })],
    );

    expect(offset).toBe(2_080);
  });

  it('rejects a furniture move outside a concave room polygon', () => {
    const room: Room = {
      id: 'concave',
      name: 'קעור',
      wallIds: [],
      polygon: [
        { x: 0, y: 0 },
        { x: 400, y: 0 },
        { x: 400, y: 400 },
        { x: 250, y: 400 },
        { x: 250, y: 150 },
        { x: 150, y: 150 },
        { x: 150, y: 400 },
        { x: 0, y: 400 },
      ],
    };
    const furniture: FurniturePlacement = {
      id: 'desk',
      roomId: 'concave',
      kind: 'desk',
      label: 'שולחן',
      x: 200,
      y: 260,
      width: 60,
      depth: 60,
      height: 750,
      elevation: 0,
      rotation: 0,
    };

    expect(validateFurnitureMove(room, furniture, [])).toBe('הריהוט יוצא מגבולות החדר');
  });

  it('rejects moving one bed through another editable furniture item', () => {
    const bedroom = requireRoom('bedroom');
    const beds = (TIFERET_5_1.furniture ?? []).filter(
      (item) => item.roomId === bedroom.id && item.kind === 'single-bed',
    );
    const firstBed = beds[0];
    const secondBed = beds[1];
    if (!firstBed || !secondBed) throw new Error('Missing two bedroom beds');
    const movedBed = { ...firstBed, x: secondBed.x, y: secondBed.y };

    expect(validateFurnitureMove(bedroom, movedBed, [], TIFERET_5_1, beds)).toBe('הריהוט חופף לפריט ריהוט אחר');
  });
});
