import type {
  DesignVisibility,
  FurnitureKind,
  FurnitureOverride,
  FurniturePlacement,
  SceneObjectCategory,
} from '../types';

const FURNITURE_CATEGORIES = {
  'single-bed': 'beds',
  'double-bed': 'beds',
  nightstand: 'beds',
  desk: 'work',
  bookshelf: 'work',
  sofa: 'living',
  'coffee-table': 'living',
  rug: 'decor',
  'media-console': 'living',
  'dining-table': 'living',
  'dining-chair': 'living',
  plant: 'decor',
  'kitchen-base-run': 'kitchen',
  'kitchen-wall-run': 'kitchen',
  refrigerator: 'kitchen',
  oven: 'kitchen',
  sink: 'kitchen',
  vanity: 'bathroom',
  toilet: 'bathroom',
  shower: 'bathroom',
  bathtub: 'bathroom',
  washer: 'utility',
  dryer: 'utility',
} as const satisfies Readonly<Record<FurnitureKind, SceneObjectCategory>>;

export function createDefaultVisibility(): DesignVisibility {
  return { hiddenObjectIds: [], hiddenCategories: [] };
}

export function sceneCategoryForFurniture(kind: FurnitureKind): SceneObjectCategory {
  return FURNITURE_CATEGORIES[kind];
}

export function applyFurnitureOverrides(
  furniture: readonly FurniturePlacement[],
  overrides: readonly FurnitureOverride[],
): FurniturePlacement[] {
  const overridesById = new Map(overrides.map((override) => [override.id, override]));
  return furniture.map((item) => {
    const override = overridesById.get(item.id);
    if (!override) return item;
    return {
      ...item,
      x: override.x,
      y: override.y,
      rotation: override.rotation,
      ...(override.width === undefined ? {} : { width: override.width }),
      ...(override.depth === undefined ? {} : { depth: override.depth }),
      ...(override.height === undefined ? {} : { height: override.height }),
      ...(override.elevation === undefined ? {} : { elevation: override.elevation }),
      ...(override.color === undefined ? {} : { color: override.color }),
      ...(override.accentColor === undefined ? {} : { accentColor: override.accentColor }),
      ...(override.material === undefined ? {} : { material: override.material }),
      ...(override.style === undefined ? {} : { style: override.style }),
    };
  });
}

export function upsertFurnitureOverride(
  overrides: readonly FurnitureOverride[],
  nextOverride: FurnitureOverride,
): FurnitureOverride[] {
  const existingIndex = overrides.findIndex((override) => override.id === nextOverride.id);
  if (existingIndex < 0) return [...overrides, nextOverride];
  return overrides.map((override, index) => (index === existingIndex ? nextOverride : override));
}

export function isSceneObjectVisible(
  visibility: DesignVisibility,
  objectId: string,
  category: SceneObjectCategory,
): boolean {
  return !visibility.hiddenCategories.includes(category) && !visibility.hiddenObjectIds.includes(objectId);
}

export function toggleSceneCategory(visibility: DesignVisibility, category: SceneObjectCategory): DesignVisibility {
  const isHidden = visibility.hiddenCategories.includes(category);
  return {
    ...visibility,
    hiddenCategories: isHidden
      ? visibility.hiddenCategories.filter((candidate) => candidate !== category)
      : [...visibility.hiddenCategories, category],
  };
}

export function toggleObjectVisibility(visibility: DesignVisibility, objectId: string): DesignVisibility {
  const isHidden = visibility.hiddenObjectIds.includes(objectId);
  return {
    ...visibility,
    hiddenObjectIds: isHidden
      ? visibility.hiddenObjectIds.filter((candidate) => candidate !== objectId)
      : [...visibility.hiddenObjectIds, objectId],
  };
}
