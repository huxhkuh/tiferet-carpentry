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
const design: SavedDesign = {
  schemaVersion: 1,
  id: 'saved-design',
  apartmentId: TIFERET_5_1.id,
  name: 'תכנון דירה 5-1',
  updatedAt: '2026-08-26T10:00:00.000Z',
  placements: [placement],
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
});

describe('safe design restoration', () => {
  it('saves and restores a complete versioned design', () => {
    const storage = createMemoryStorage();
    saveDesign(storage, 'design', design);

    expect(restoreDesign(storage, 'design', TIFERET_5_1.id)).toEqual(design);
    expect(restoreDesign(storage, 'design', 'another-apartment')).toBeNull();
  });

  it('returns null for corrupt storage instead of throwing', () => {
    const storage = createMemoryStorage('{broken');

    expect(() => restoreDesign(storage, 'design')).not.toThrow();
    expect(restoreDesign(storage, 'design')).toBeNull();
  });

  it('clears a stored design', () => {
    const storage = createMemoryStorage(serializeDesign(design));

    clearDesign(storage, 'design');

    expect(restoreDesign(storage, 'design')).toBeNull();
  });

  it('rejects duplicate placement IDs and cross-apartment placements', () => {
    expect(deserializeDesign(JSON.stringify({ ...design, placements: [placement, { ...placement }] }))).toBeNull();
    expect(
      deserializeDesign(
        JSON.stringify({ ...design, placements: [{ ...placement, apartmentId: 'another-apartment' }] }),
      ),
    ).toBeNull();
  });

  it('refuses to serialize a runtime object with inconsistent duplicated dimensions', () => {
    const inconsistent = {
      ...design,
      placements: [{ ...placement, width: placement.width + 1 }],
    };

    expect(() => serializeDesign(inconsistent)).toThrow(/סכימת השמירה/);
  });
});
