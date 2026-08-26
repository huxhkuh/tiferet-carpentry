import { describe, expect, it } from 'vitest';
import { TIFERET_5_1 } from '../../src/apartment/data/tiferet';
import {
  cabinetFootprint,
  createCabinetPlacement,
  deserializeDesign,
  getAvailableWallSegments,
  isPlacementValid,
  placementTransform,
  placementTransformForRoom,
  serializeDesign,
  validateApartment,
  validatePlacement,
  wallAngle,
  wallLength,
} from '../../src/apartment/geometry/placement';
import type { SavedDesign } from '../../src/apartment/types';
import type { CabinetPlacement, Wall } from '../../src/apartment/types';

describe('Tiferet apartment geometry', () => {
  const wall = TIFERET_5_1.walls.find((item) => item.id === 'bed-e')!;
  it('validates normalized apartment data and wall measurements', () => {
    expect(validateApartment(TIFERET_5_1)).toBe(true);
    expect(wallLength(wall)).toBe(3000);
  });
  it('creates a wall-relative transform facing into the room', () => {
    expect(wallAngle(wall)).toBeCloseTo(Math.PI / 2);
    expect(placementTransform(wall, 500)).toEqual({ x: 5944, y: 500, orientation: Math.PI });
  });
  it.each([
    [1800, 0, null],
    [3100, 0, 'הארון רחב מהשטח הזמין בקיר'],
  ])('validates cabinet width %i', (width, distance, error) =>
    expect(validatePlacement(wall, width, distance)).toBe(error),
  );
  it('prevents overlap with door openings', () => {
    const doorWall = TIFERET_5_1.walls.find((item) => item.id === 'bed-s')!;
    expect(validatePlacement(doorWall, 900, 0)).toBe('מיקום הארון חופף לפתח בקיר');
  });

  it('returns usable wall segments split around openings', () => {
    const doorWall = TIFERET_5_1.walls.find((item) => item.id === 'bed-s')!;

    expect(getAvailableWallSegments(doorWall)).toEqual([
      { start: 0, end: 180 },
      { start: 980, end: 2700 },
    ]);
  });

  it('computes a cabinet footprint snapped to a selected wall', () => {
    const footprint = cabinetFootprint(wall, 500, 1200, 600);

    expect(footprint.map((point) => ({ x: Math.round(point.x), y: Math.round(point.y) }))).toEqual([
      { x: 5944, y: 500 },
      { x: 5944, y: 1700 },
      { x: 5344, y: 1700 },
      { x: 5344, y: 500 },
    ]);
  });

  it('accepts only physically possible placements', () => {
    const doorWall = TIFERET_5_1.walls.find((item) => item.id === 'bed-s')!;

    expect(isPlacementValid(doorWall, 1200, 1200)).toBe(true);
    expect(isPlacementValid(doorWall, 1200, 0)).toBe(false);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 0, -1])(
    'rejects a non-positive or non-finite cabinet width: %s',
    (width) => {
      expect(validatePlacement(wall, width, 0)).toBe('מידות הארון חייבות להיות מספרים חיוביים');
    },
  );

  it('rejects overlap with an existing cabinet on the same wall', () => {
    const room = TIFERET_5_1.rooms.find((item) => item.id === 'bedroom')!;
    const existing = [
      createCabinetPlacement({
        apartment: TIFERET_5_1,
        room,
        wall,
        cabinetConfig: { width: 1000, height: 2400, depth: 600 },
        distanceFromWallStart: 400,
        id: 'existing',
      }),
    ];
    const validateWithExisting: (
      candidateWall: Wall,
      width: number,
      distance: number,
      placements: readonly CabinetPlacement[],
    ) => string | null = validatePlacement;

    expect(validateWithExisting(wall, 900, 900, existing)).toBe('מיקום הארון חופף לארון קיים');
    expect(validateWithExisting(wall, 900, 1400, existing)).toBeNull();
  });

  it('keeps a future-ready project hierarchy around the apartment', () => {
    expect(TIFERET_5_1.source).toMatchObject({
      project: 'Tiferet',
      building: 'Techelet',
      floor: 5,
      sheet: '5-1',
      sourceType: 'sales-plan-pdf',
      modelingMethod: 'semi-automatic',
    });
    expect(TIFERET_5_1.fixedElements.length).toBeGreaterThan(0);
    expect(TIFERET_5_1.rooms.map((room) => room.name)).toEqual(
      expect.arrayContaining(['מטבח', 'אמבטיה', 'חדר שינה', 'חדר שינה הורים', 'ממ״ד', 'חדר רחצה', 'מסתור כביסה']),
    );
  });
  it('creates a cabinet placement with explicit dimensions and a room-facing orientation', () => {
    const room = TIFERET_5_1.rooms.find((item) => item.id === 'bedroom')!;
    const placement = createCabinetPlacement({
      apartment: TIFERET_5_1,
      room,
      wall,
      cabinetConfig: { width: 1800, height: 2400, depth: 600 },
      distanceFromWallStart: 400,
      id: 'placement-1',
    });

    expect(placement).toMatchObject({
      id: 'placement-1',
      apartmentId: TIFERET_5_1.id,
      roomId: room.id,
      wallId: wall.id,
      width: 1800,
      height: 2400,
      depth: 600,
    });
    expect(placement.orientation).toBe(placementTransformForRoom(wall, room, 400).orientation);
  });

  it('uses the wardrobe defaults before applying caller overrides', () => {
    const room = TIFERET_5_1.rooms.find((item) => item.id === 'bedroom')!;
    const placement = createCabinetPlacement({
      apartment: TIFERET_5_1,
      room,
      wall,
      cabinetConfig: { width: 900 },
      id: 'wardrobe-defaults',
    });

    expect(placement.cabinetConfig).toMatchObject({
      furnitureType: 'wardrobe',
      width: 900,
      height: 2100,
      depth: 600,
      shelfCount: 1,
      lang: 'he',
    });
  });

  it('rejects duplicate wall and opening identifiers during apartment validation', () => {
    const duplicateWall = {
      ...TIFERET_5_1,
      walls: [...TIFERET_5_1.walls, { ...TIFERET_5_1.walls[0] }],
    };
    const duplicateOpening = {
      ...TIFERET_5_1,
      walls: TIFERET_5_1.walls.map((candidate, index) =>
        index === 1
          ? {
              ...candidate,
              openings: [
                {
                  ...TIFERET_5_1.walls[0].openings[0],
                },
              ],
            }
          : candidate,
      ),
    };

    expect(validateApartment(duplicateWall)).toBe(false);
    expect(validateApartment(duplicateOpening)).toBe(false);
  });
});

describe('design persistence', () => {
  it('round trips a versioned saved design and rejects invalid input', () => {
    const design: SavedDesign = {
      schemaVersion: 1,
      id: 'x',
      apartmentId: TIFERET_5_1.id,
      name: 'test',
      updatedAt: '2026-01-01',
      placements: [],
    };
    expect(deserializeDesign(serializeDesign(design))).toEqual(design);
    expect(deserializeDesign('{bad')).toBeNull();
  });

  it.each([
    { schemaVersion: 1, placements: [] },
    {
      schemaVersion: 1,
      id: 'x',
      apartmentId: TIFERET_5_1.id,
      name: 'test',
      updatedAt: 'not-a-date',
      placements: [],
    },
    {
      schemaVersion: 1,
      id: 'x',
      apartmentId: TIFERET_5_1.id,
      name: 'test',
      updatedAt: '2026-01-01T00:00:00.000Z',
      placements: [{ id: 'placement-without-geometry' }],
    },
    {
      schemaVersion: 2,
      id: 'x',
      apartmentId: TIFERET_5_1.id,
      name: 'test',
      updatedAt: '2026-01-01T00:00:00.000Z',
      placements: [],
    },
  ])('rejects an invalid saved-design payload: %#', (payload) => {
    expect(deserializeDesign(JSON.stringify(payload))).toBeNull();
  });
});
