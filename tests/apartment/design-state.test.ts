import { describe, expect, it } from 'vitest';
import {
  applyFurnitureOverrides,
  createDefaultVisibility,
  isSceneObjectVisible,
  sceneCategoryForFurniture,
  toggleObjectVisibility,
  toggleSceneCategory,
  upsertFurnitureOverride,
} from '../../src/apartment/planner/design-state';
import type { FurniturePlacement } from '../../src/apartment/types';

const BED: FurniturePlacement = {
  id: 'bed-a',
  roomId: 'bedroom',
  kind: 'single-bed',
  label: 'מיטת יחיד',
  x: 1_000,
  y: 1_200,
  width: 900,
  depth: 1_950,
  height: 900,
  elevation: 0,
  rotation: 0,
};

describe('planner design state', () => {
  it('applies furniture position overrides without mutating the apartment catalogue', () => {
    const catalogue = [BED];

    const resolved = applyFurnitureOverrides(catalogue, [{ id: BED.id, x: 1_450, y: 1_600, rotation: Math.PI / 2 }]);

    expect(resolved[0]).toMatchObject({ id: BED.id, x: 1_450, y: 1_600, rotation: Math.PI / 2 });
    expect(catalogue[0]).toEqual(BED);
    expect(resolved[0]).not.toBe(catalogue[0]);
  });

  it('upserts one stable override and preserves the remaining edits', () => {
    const original = [
      { id: 'desk', x: 500, y: 600, rotation: 0 },
      { id: BED.id, x: BED.x, y: BED.y, rotation: BED.rotation },
    ];

    const next = upsertFurnitureOverride(original, { id: BED.id, x: 1_300, y: 1_500, rotation: 0.25 });

    expect(next).toEqual([original[0], { id: BED.id, x: 1_300, y: 1_500, rotation: 0.25 }]);
    expect(original[1]).toMatchObject({ x: BED.x, y: BED.y });
  });

  it.each([
    ['single-bed', 'beds'],
    ['kitchen-base-run', 'kitchen'],
    ['bathtub', 'bathroom'],
    ['sofa', 'living'],
    ['desk', 'work'],
    ['washer', 'utility'],
    ['plant', 'decor'],
  ] as const)('maps %s to the %s visibility layer', (kind, expectedCategory) => {
    expect(sceneCategoryForFurniture(kind)).toBe(expectedCategory);
  });

  it('toggles complete layers and individual objects independently', () => {
    const initial = createDefaultVisibility();
    const withoutBeds = toggleSceneCategory(initial, 'beds');
    const withoutOneCabinet = toggleObjectVisibility(withoutBeds, 'cabinet-a');

    expect(isSceneObjectVisible(withoutOneCabinet, BED.id, 'beds')).toBe(false);
    expect(isSceneObjectVisible(withoutOneCabinet, 'cabinet-a', 'cabinetry')).toBe(false);
    expect(isSceneObjectVisible(withoutOneCabinet, 'cabinet-b', 'cabinetry')).toBe(true);
    expect(initial).toEqual({ hiddenObjectIds: [], hiddenCategories: [] });
  });

  it('restores a hidden object when toggled a second time', () => {
    const hidden = toggleObjectVisibility(createDefaultVisibility(), BED.id);
    const visible = toggleObjectVisibility(hidden, BED.id);

    expect(visible.hiddenObjectIds).toEqual([]);
  });
});
