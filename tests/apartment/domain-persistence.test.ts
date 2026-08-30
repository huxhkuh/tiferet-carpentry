import { describe, expect, it } from 'vitest';
import { createCabinetPlacement } from '../../src/apartment/cabinet/adapter';
import { TIFERET_5_1, TIFERET_PROJECT } from '../../src/apartment/data/tiferet';
import {
  getApartmentValidationIssues,
  validateApartment,
  validateProject,
} from '../../src/apartment/validation/apartment';
import {
  clearDesign,
  deserializeDesign,
  restoreDesign,
  saveDesign,
  serializeDesign,
} from '../../src/apartment/persistence/design';
import type { DesignStorage } from '../../src/apartment/persistence/design';
import type { Project, SavedDesign } from '../../src/apartment/types';

const bedroom = TIFERET_5_1.rooms.find((room) => room.id === 'bedroom')!;
const eastWall = TIFERET_5_1.walls.find((wall) => wall.id === 'bed-e')!;
const placement = createCabinetPlacement({
  apartment: TIFERET_5_1,
  room: bedroom,
  wall: eastWall,
  cabinetConfig: { width: 900 },
  id: 'saved-placement',
});
const legacyDesign = {
  schemaVersion: 1 as const,
  id: 'saved-design',
  apartmentId: TIFERET_5_1.id,
  name: 'תכנון דירה 5-1',
  updatedAt: '2026-08-26T10:00:00.000Z',
  placements: [placement],
};
const v2Design: SavedDesign = {
  ...legacyDesign,
  schemaVersion: 2,
  furnitureOverrides: [{ id: 'bedroom-bed-a', x: 3_650, y: 1_100, rotation: Math.PI / 2 }],
  visibility: {
    hiddenObjectIds: ['kitchen-fridge'],
    hiddenCategories: ['decor'],
  },
  furniturePalette: 'sage',
  cameraByRoom: {
    bedroom: { yaw: 2.1, pitch: -0.6, zoom: 1.25 },
  },
};

function createMemoryStorage(initialValue: string | null = null): DesignStorage {
  let value = initialValue;
  return {
    getItem: () => value,
    setItem: (_key, nextValue) => {
      value = nextValue;
    },
    removeItem: () => {
      value = null;
    },
  };
}

describe('apartment/project validation', () => {
  it('accepts the stable-ID Tiferet hierarchy', () => {
    expect(validateProject(TIFERET_PROJECT)).toBe(true);
  });

  it('rejects repeated wall references inside a room', () => {
    const apartment = {
      ...TIFERET_5_1,
      rooms: TIFERET_5_1.rooms.map((room, index) =>
        index === 0 ? { ...room, wallIds: [...room.wallIds, room.wallIds[0]] } : room,
      ),
    };

    expect(validateApartment(apartment)).toBe(false);
  });

  it('rejects malformed or duplicate source-vector wall masses', () => {
    const [firstMass, secondMass] = TIFERET_5_1.wallMasses ?? [];
    const apartment = {
      ...TIFERET_5_1,
      wallMasses: [
        { ...firstMass, polygon: firstMass.polygon.slice(0, 2) },
        { ...secondMass, id: firstMass.id },
      ],
    };

    expect(getApartmentValidationIssues(apartment).map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['INVALID_POLYGON', 'DUPLICATE_ENTITY_ID']),
    );
  });

  it('rejects an apartment type reference that is absent from the project catalog', () => {
    const project: Project = {
      ...TIFERET_PROJECT,
      buildings: TIFERET_PROJECT.buildings.map((building) => ({
        ...building,
        floors: building.floors.map((floor) => ({
          ...floor,
          apartments: floor.apartments.map((apartment) => ({
            ...apartment,
            apartmentTypeId: 'unknown-type',
          })),
        })),
      })),
    };

    expect(validateProject(project)).toBe(false);
  });

  it('reports invalid geometry, references, obstacles and source provenance', () => {
    const apartment = {
      ...TIFERET_5_1,
      source: { ...TIFERET_5_1.source, floor: 5.5 },
      walls: TIFERET_5_1.walls.map((wall, index) =>
        index === 0
          ? {
              ...wall,
              end: { ...wall.start },
              openings: [{ id: 'invalid-opening', kind: 'door' as const, offset: -1, width: 0 }],
            }
          : wall,
      ),
      rooms: TIFERET_5_1.rooms.map((room, index) =>
        index === 0 ? { ...room, polygon: room.polygon.slice(0, 2), wallIds: [...room.wallIds, 'missing-wall'] } : room,
      ),
      fixedElements: TIFERET_5_1.fixedElements.map((element, index) =>
        index === 0 ? { ...element, roomId: 'missing-room', polygon: [] } : element,
      ),
    };

    expect(getApartmentValidationIssues(apartment).map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'ZERO_LENGTH_WALL',
        'INVALID_POLYGON',
        'UNKNOWN_WALL_REFERENCE',
        'UNKNOWN_ROOM_REFERENCE',
        'INVALID_SOURCE',
      ]),
    );
  });

  it('rejects a supposedly verified source while unresolved architectural fields remain', () => {
    const apartment = {
      ...TIFERET_5_1,
      source: {
        ...TIFERET_5_1.source,
        geometryStatus: 'verified' as const,
      },
    };

    expect(getApartmentValidationIssues(apartment).map((issue) => issue.code)).toContain('INVALID_SOURCE');
  });

  it.each([
    ['sourceRoomCount', 0],
    ['sourceAreaSqm', Number.NaN],
    ['sourceCoveredBalconyAreaSqm', -1],
    ['sourceSukkahBalconyAreaSqm', -1],
    ['sourceEdition', 0],
    ['sourceApartmentNumber', ''],
    ['sourceBuildingType', ''],
    ['sourceScale', ''],
    ['sourceDate', ''],
  ] as const)('rejects invalid inspected title-block metadata in %s', (field, value) => {
    const apartment = {
      ...TIFERET_5_1,
      source: {
        ...TIFERET_5_1.source,
        [field]: value,
      },
    };

    expect(getApartmentValidationIssues(apartment).map((issue) => issue.code)).toContain('INVALID_SOURCE');
  });
});

describe('safe design restoration', () => {
  it('saves and restores a complete versioned design', () => {
    const storage = createMemoryStorage();
    saveDesign(storage, 'design', v2Design);

    expect(restoreDesign(storage, 'design', TIFERET_5_1.id)).toEqual(v2Design);
    expect(restoreDesign(storage, 'design', 'another-apartment')).toBeNull();
  });

  it('returns null for corrupt storage instead of throwing', () => {
    const storage = createMemoryStorage('{broken');

    expect(() => restoreDesign(storage, 'design')).not.toThrow();
    expect(restoreDesign(storage, 'design')).toBeNull();
  });

  it('clears a stored design', () => {
    const storage = createMemoryStorage(serializeDesign(v2Design));

    clearDesign(storage, 'design');

    expect(restoreDesign(storage, 'design')).toBeNull();
  });

  it('rejects duplicate placement IDs and cross-apartment placements', () => {
    expect(deserializeDesign(JSON.stringify({ ...v2Design, placements: [placement, { ...placement }] }))).toBeNull();
    expect(
      deserializeDesign(
        JSON.stringify({ ...v2Design, placements: [{ ...placement, apartmentId: 'another-apartment' }] }),
      ),
    ).toBeNull();
  });

  it('refuses to serialize a runtime object with inconsistent duplicated dimensions', () => {
    const inconsistent = {
      ...v2Design,
      placements: [{ ...placement, width: placement.width + 1 }],
    };

    expect(() => serializeDesign(inconsistent)).toThrow(/סכימת השמירה/);
  });

  it('migrates a legacy schema v1 design into schema v2 defaults', () => {
    const restored = deserializeDesign(JSON.stringify(legacyDesign));

    expect(restored).toEqual({
      ...legacyDesign,
      schemaVersion: 2,
      furnitureOverrides: [],
      visibility: {
        hiddenObjectIds: [],
        hiddenCategories: [],
      },
      furniturePalette: 'warm',
      cameraByRoom: {},
    });
  });

  it('round trips a schema v2 design with furniture, visibility and per-room camera state', () => {
    expect(deserializeDesign(serializeDesign(v2Design))).toEqual(v2Design);
  });

  it('rejects duplicate furniture overrides', () => {
    expect(
      deserializeDesign(
        JSON.stringify({
          ...v2Design,
          furnitureOverrides: [
            { id: 'bedroom-bed-a', x: 3_650, y: 1_100, rotation: 0 },
            { id: 'bedroom-bed-a', x: 3_800, y: 1_200, rotation: 0 },
          ],
        }),
      ),
    ).toBeNull();
  });

  it('rejects malformed and duplicate user-added furniture', () => {
    const sourceFurniture = TIFERET_5_1.furniture?.[0];
    if (!sourceFurniture) throw new Error('Missing furniture fixture');
    const addedFurniture = { ...sourceFurniture, id: 'user-bed', roomId: 'bedroom' };

    expect(
      deserializeDesign(
        JSON.stringify({
          ...v2Design,
          addedFurniture: [addedFurniture, { ...addedFurniture }],
        }),
      ),
    ).toBeNull();
    expect(
      deserializeDesign(
        JSON.stringify({
          ...v2Design,
          addedFurniture: [{ ...addedFurniture, width: -1 }],
        }),
      ),
    ).toBeNull();
  });

  it('rejects malformed visibility categories and duplicate hidden object ids', () => {
    expect(
      deserializeDesign(
        JSON.stringify({
          ...v2Design,
          visibility: {
            hiddenObjectIds: ['bedroom-bed-a', 'bedroom-bed-a'],
            hiddenCategories: ['beds'],
          },
        }),
      ),
    ).toBeNull();
    expect(
      deserializeDesign(
        JSON.stringify({
          ...v2Design,
          visibility: {
            hiddenObjectIds: [],
            hiddenCategories: ['unknown-category'],
          },
        }),
      ),
    ).toBeNull();
  });

  it('rejects malformed per-room camera state', () => {
    expect(
      deserializeDesign(
        JSON.stringify({
          ...v2Design,
          cameraByRoom: {
            bedroom: { yaw: 2.1, pitch: Number.NaN, zoom: 1 },
          },
        }),
      ),
    ).toBeNull();
    expect(
      deserializeDesign(
        JSON.stringify({
          ...v2Design,
          cameraByRoom: {
            '': { yaw: 2.1, pitch: -0.6, zoom: 1 },
          },
        }),
      ),
    ).toBeNull();
  });
});
