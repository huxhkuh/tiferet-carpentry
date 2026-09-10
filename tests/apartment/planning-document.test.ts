import { describe, expect, it } from 'vitest';
import { TIFERET_5_1 } from '../../src/apartment/data/tiferet';
import { createDesignLibrary } from '../../src/apartment/persistence/design-library';
import {
  deserializePlanningDocument,
  restorePlanningDocument,
  savePlanningDocument,
  serializePlanningDocument,
} from '../../src/apartment/persistence/planning-document';
import type { DesignStorage } from '../../src/apartment/persistence/design';
import type { SavedDesignV3 } from '../../src/apartment/types';
import { designValidationError } from '../../src/apartment/planner/design-validation';

describe('atomic planning documents', () => {
  it('round-trips optional object locks and rejects malformed or dangling lock references', () => {
    const draft: SavedDesignV3 = {
      schemaVersion: 3,
      id: 'locks',
      apartmentId: TIFERET_5_1.id,
      name: 'Locks',
      updatedAt: '2026-09-10T05:00:00.000Z',
      placements: [],
      furnitureOverrides: [],
      visibility: { hiddenObjectIds: [], hiddenCategories: [], lockedObjectIds: ['bedroom-bed-a'] },
      furniturePalette: 'warm',
      cameraByRoom: {},
    };
    const document = {
      schemaVersion: 1 as const,
      apartment: TIFERET_5_1,
      draft,
      library: createDesignLibrary(TIFERET_5_1.id),
    };
    expect(deserializePlanningDocument(serializePlanningDocument(document))?.draft?.visibility.lockedObjectIds).toEqual(
      ['bedroom-bed-a'],
    );
    expect(designValidationError(TIFERET_5_1, draft)).toBeNull();
    for (const lockedObjectIds of [['bedroom-bed-a', 'bedroom-bed-a'], [''], [42]]) {
      expect(
        deserializePlanningDocument(
          JSON.stringify({ ...document, draft: { ...draft, visibility: { ...draft.visibility, lockedObjectIds } } }),
        ),
      ).toBeNull();
    }
    expect(
      designValidationError(TIFERET_5_1, {
        ...draft,
        visibility: { ...draft.visibility, lockedObjectIds: ['missing'] },
      }),
    ).toMatch(/שאינו קיים/);
  });

  it('keeps the committed document when a compatibility mirror fails', () => {
    const values = new Map<string, string>();
    const storage: DesignStorage = {
      getItem: (key) => values.get(key) ?? null,
      removeItem: (key) => {
        values.delete(key);
      },
      setItem: (key, value) => {
        if (key.startsWith('tiferet:design-library')) throw new Error('quota');
        values.set(key, value);
      },
    };
    const document = {
      schemaVersion: 1 as const,
      apartment: TIFERET_5_1,
      draft: null,
      library: createDesignLibrary(TIFERET_5_1.id),
    };
    expect(() => savePlanningDocument(storage, document)).not.toThrow();
    expect(restorePlanningDocument(storage, TIFERET_5_1)).toEqual(document);
    expect(deserializePlanningDocument(serializePlanningDocument(document))).toEqual(document);
  });

  it('rejects malformed portable documents and recovers from inaccessible storage', () => {
    const storage: DesignStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {},
      removeItem: () => {},
    };
    expect(restorePlanningDocument(storage, TIFERET_5_1).draft).toBeNull();
    expect(deserializePlanningDocument('{"schemaVersion":1,"apartment":{},"draft":null,"library":{}}')).toBeNull();
  });
});
