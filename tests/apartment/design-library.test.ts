import { describe, expect, it } from 'vitest';
import {
  addDesignVersion,
  createDesignLibrary,
  deserializeDesignLibrary,
  removeDesignVersion,
  restoreDesignLibrary,
  serializeDesignLibrary,
} from '../../src/apartment/persistence/design-library';
import type { DesignStorage } from '../../src/apartment/persistence/design';
import type { SavedDesignV2 } from '../../src/apartment/types';

const firstDesign: SavedDesignV2 = {
  schemaVersion: 2,
  id: 'design-a',
  apartmentId: 'apartment-5-1',
  name: 'חלופה בהירה',
  updatedAt: '2026-08-27T08:00:00.000Z',
  placements: [],
  furnitureOverrides: [],
  visibility: { hiddenObjectIds: [], hiddenCategories: [] },
  furniturePalette: 'light',
  cameraByRoom: {},
};

describe('saved design version library', () => {
  it('adds and updates immutable versions in most-recent-first order', () => {
    const empty = createDesignLibrary(firstDesign.apartmentId);
    const withFirst = addDesignVersion(empty, firstDesign);
    const secondDesign = {
      ...firstDesign,
      id: 'design-b',
      name: 'חלופה חמה',
      updatedAt: '2026-08-27T09:00:00.000Z',
      furniturePalette: 'warm' as const,
    };
    const withSecond = addDesignVersion(withFirst, secondDesign);
    const updatedFirst = addDesignVersion(withSecond, {
      ...firstDesign,
      name: 'חלופה בהירה מעודכנת',
      updatedAt: '2026-08-27T10:00:00.000Z',
    });

    expect(empty.designs).toEqual([]);
    expect(withFirst.designs).toEqual([firstDesign]);
    expect(withSecond.designs.map((design) => design.id)).toEqual(['design-b', 'design-a']);
    expect(updatedFirst.designs.map((design) => design.id)).toEqual(['design-a', 'design-b']);
    expect(updatedFirst.activeDesignId).toBe('design-a');
  });

  it('round-trips a validated library and rejects foreign, duplicate or corrupt designs', () => {
    const library = addDesignVersion(createDesignLibrary(firstDesign.apartmentId), firstDesign);

    expect(deserializeDesignLibrary(serializeDesignLibrary(library), firstDesign.apartmentId)).toEqual(library);
    expect(deserializeDesignLibrary('{broken', firstDesign.apartmentId)).toBeNull();
    expect(
      deserializeDesignLibrary(
        JSON.stringify({ ...library, designs: [firstDesign, { ...firstDesign }] }),
        firstDesign.apartmentId,
      ),
    ).toBeNull();
    expect(deserializeDesignLibrary(serializeDesignLibrary(library), 'another-apartment')).toBeNull();
  });

  it('removes a version and deterministically selects the next available design', () => {
    const library = addDesignVersion(addDesignVersion(createDesignLibrary(firstDesign.apartmentId), firstDesign), {
      ...firstDesign,
      id: 'design-b',
      updatedAt: '2026-08-27T09:00:00.000Z',
    });

    expect(removeDesignVersion(library, 'design-b')).toMatchObject({
      activeDesignId: 'design-a',
      designs: [firstDesign],
    });
    expect(removeDesignVersion(removeDesignVersion(library, 'design-b'), 'design-a')).toMatchObject({
      activeDesignId: null,
      designs: [],
    });
  });

  it('returns null when browser storage cannot be read', () => {
    const storage: DesignStorage = {
      getItem: () => {
        throw new DOMException('Storage is disabled', 'SecurityError');
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };

    expect(() => restoreDesignLibrary(storage, 'library', firstDesign.apartmentId)).not.toThrow();
    expect(restoreDesignLibrary(storage, 'library', firstDesign.apartmentId)).toBeNull();
  });
});
