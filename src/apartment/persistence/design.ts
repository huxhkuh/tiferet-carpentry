import type { CabinetConfig } from '../../engine/types';
import type {
  CabinetPlacement,
  DesignVisibility,
  FurnitureOverride,
  FurniturePalette,
  FurniturePlacement,
  RoomCameraOrbit,
  SavedDesign,
  SavedDesignV1,
  SavedDesignV2,
  SavedDesignMetadata,
  SceneObjectCategory,
} from '../types';

export const SAVED_DESIGN_SCHEMA_VERSION = 2 as const;

export interface DesignStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const FURNITURE_TYPES = ['cabinet', 'bookshelf', 'desk', 'wardrobe', 'panel'] as const;
const SHELF_SPACING_VALUES = ['equal', 'custom'] as const;
const DOOR_STYLES = ['flat', 'shaker', 'glass', 'none'] as const;
const DRAWER_SLIDE_TYPES = ['standard', 'soft-close', 'full-extension'] as const;
const HANDLE_STYLES = ['bar', 'knob', 'cup', 'none'] as const;
const JOINERY_TYPES = ['pocket-screw', 'dado', 'dowel', 'biscuit', 'screw', 'mortise-tenon', 'dovetail'] as const;
const EDGE_BANDING_VALUES = ['all-visible', 'doors-only', 'none'] as const;
const CUT_MODES = ['guillotine', 'freeform'] as const;
const LANGUAGES = ['en', 'he'] as const;
const PANEL_MATERIAL_SOURCES = ['carcass', 'back'] as const;
const FURNITURE_PALETTES: readonly FurniturePalette[] = ['warm', 'light', 'sage'];
const FURNITURE_KINDS = [
  'single-bed',
  'double-bed',
  'nightstand',
  'desk',
  'bookshelf',
  'sofa',
  'coffee-table',
  'rug',
  'media-console',
  'dining-table',
  'dining-chair',
  'plant',
  'kitchen-base-run',
  'kitchen-wall-run',
  'refrigerator',
  'oven',
  'sink',
  'vanity',
  'toilet',
  'shower',
  'bathtub',
  'washer',
  'dryer',
] as const;
const SCENE_OBJECT_CATEGORIES: readonly SceneObjectCategory[] = [
  'cabinetry',
  'beds',
  'kitchen',
  'bathroom',
  'living',
  'work',
  'utility',
  'decor',
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isPositiveNumber = (value: unknown): value is number => isFiniteNumber(value) && value > 0;
const isNonNegativeNumber = (value: unknown): value is number => isFiniteNumber(value) && value >= 0;
const isNonNegativeInteger = (value: unknown): value is number => Number.isInteger(value) && isNonNegativeNumber(value);
const isOptionalBoolean = (value: unknown): boolean => value === undefined || typeof value === 'boolean';
const isOptionalString = (value: unknown): boolean => value === undefined || typeof value === 'string';
const isOneOf = (value: unknown, options: readonly string[]): value is string =>
  typeof value === 'string' && options.includes(value);
const isOptionalOneOf = (value: unknown, options: readonly string[]): boolean =>
  value === undefined || isOneOf(value, options);
const isNumberArray = (value: unknown): value is number[] => Array.isArray(value) && value.every(isNonNegativeNumber);

function isHardwareOverrides(value: unknown): boolean {
  return value === undefined || (isRecord(value) && Object.values(value).every(isNonNegativeInteger));
}

export function isCabinetConfig(value: unknown): value is CabinetConfig {
  if (!isRecord(value)) return false;
  return (
    isOneOf(value.furnitureType, FURNITURE_TYPES) &&
    isPositiveNumber(value.width) &&
    isPositiveNumber(value.height) &&
    isPositiveNumber(value.depth) &&
    isNonNegativeInteger(value.shelfCount) &&
    isOneOf(value.shelfSpacing, SHELF_SPACING_VALUES) &&
    isNumberArray(value.customShelfPositions) &&
    (value.shelfCentreSupports === undefined || isNonNegativeInteger(value.shelfCentreSupports)) &&
    isNonEmptyString(value.carcassMaterial) &&
    isNonEmptyString(value.backPanelMaterial) &&
    isOptionalBoolean(value.hasBack) &&
    isOptionalOneOf(value.panelMaterialSource, PANEL_MATERIAL_SOURCES) &&
    (value.doorCount === 1 || value.doorCount === 2) &&
    isOneOf(value.doorStyle, DOOR_STYLES) &&
    isNonNegativeNumber(value.doorReveal) &&
    isNonNegativeInteger(value.drawerCount) &&
    (value.drawerHeights === undefined || isNumberArray(value.drawerHeights)) &&
    isOptionalOneOf(value.drawerSlideType, DRAWER_SLIDE_TYPES) &&
    isNonNegativeNumber(value.kickHeight) &&
    isOneOf(value.handleStyle, HANDLE_STYLES) &&
    isOptionalString(value.hingeProfile) &&
    isHardwareOverrides(value.hardwareOverrides) &&
    isOptionalOneOf(value.joineryType, JOINERY_TYPES) &&
    isOneOf(value.edgeBanding, EDGE_BANDING_VALUES) &&
    isOptionalOneOf(value.cutMode, CUT_MODES) &&
    isOneOf(value.lang, LANGUAGES) &&
    isOptionalBoolean(value.isMirrored)
  );
}

export function isCabinetPlacement(value: unknown): value is CabinetPlacement {
  if (!isRecord(value) || !isCabinetConfig(value.cabinetConfig)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.apartmentId) &&
    isNonEmptyString(value.roomId) &&
    isNonEmptyString(value.wallId) &&
    isNonNegativeNumber(value.distanceFromWallStart) &&
    isNonNegativeNumber(value.elevation) &&
    isFiniteNumber(value.orientation) &&
    isPositiveNumber(value.width) &&
    isPositiveNumber(value.depth) &&
    isPositiveNumber(value.height) &&
    value.width === value.cabinetConfig.width &&
    value.depth === value.cabinetConfig.depth &&
    value.height === value.cabinetConfig.height
  );
}

function isSavedDesignMetadata(value: unknown): value is SavedDesignMetadata {
  return (
    isRecord(value) &&
    (value.customerName === undefined || typeof value.customerName === 'string') &&
    (value.notes === undefined || typeof value.notes === 'string')
  );
}

const hasUniqueStrings = (values: readonly string[]): boolean => new Set(values).size === values.length;

function isFurnitureOverride(value: unknown): value is FurnitureOverride {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.rotation)
  );
}

function isFurniturePlacement(value: unknown): value is FurniturePlacement {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.roomId) &&
    isOneOf(value.kind, FURNITURE_KINDS) &&
    isNonEmptyString(value.label) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isPositiveNumber(value.width) &&
    isPositiveNumber(value.depth) &&
    isPositiveNumber(value.height) &&
    isNonNegativeNumber(value.elevation) &&
    isFiniteNumber(value.rotation) &&
    isOptionalString(value.color) &&
    isOptionalString(value.accentColor)
  );
}

function isDesignVisibility(value: unknown): value is DesignVisibility {
  if (!isRecord(value) || !Array.isArray(value.hiddenObjectIds) || !Array.isArray(value.hiddenCategories)) {
    return false;
  }
  return (
    value.hiddenObjectIds.every(isNonEmptyString) &&
    hasUniqueStrings(value.hiddenObjectIds) &&
    value.hiddenCategories.every((category) => isOneOf(category, SCENE_OBJECT_CATEGORIES)) &&
    hasUniqueStrings(value.hiddenCategories)
  );
}

function isRoomCameraOrbit(value: unknown): value is RoomCameraOrbit {
  return isRecord(value) && isFiniteNumber(value.yaw) && isFiniteNumber(value.pitch) && isPositiveNumber(value.zoom);
}

function isCameraByRoom(value: unknown): value is Record<string, RoomCameraOrbit> {
  return (
    isRecord(value) &&
    Object.entries(value).every(([roomId, camera]) => isNonEmptyString(roomId) && isRoomCameraOrbit(camera))
  );
}

function hasValidPlacementEnvelope(value: Record<string, unknown>): boolean {
  if (
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.apartmentId) ||
    !isNonEmptyString(value.name) ||
    !isNonEmptyString(value.updatedAt) ||
    !Number.isFinite(Date.parse(value.updatedAt)) ||
    (value.metadata !== undefined && !isSavedDesignMetadata(value.metadata)) ||
    !Array.isArray(value.placements) ||
    !value.placements.every(isCabinetPlacement)
  ) {
    return false;
  }
  const placements = value.placements;
  return (
    new Set(placements.map((placement) => placement.id)).size === placements.length &&
    placements.every((placement) => placement.apartmentId === value.apartmentId)
  );
}

function isLegacySavedDesign(value: unknown): value is SavedDesignV1 {
  return isRecord(value) && value.schemaVersion === 1 && hasValidPlacementEnvelope(value);
}

export function isSavedDesign(value: unknown): value is SavedDesignV2 {
  if (!isRecord(value) || value.schemaVersion !== SAVED_DESIGN_SCHEMA_VERSION || !hasValidPlacementEnvelope(value)) {
    return false;
  }
  if (
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.apartmentId) ||
    !isNonEmptyString(value.name) ||
    !isNonEmptyString(value.updatedAt) ||
    !Number.isFinite(Date.parse(value.updatedAt)) ||
    (value.metadata !== undefined && !isSavedDesignMetadata(value.metadata)) ||
    !Array.isArray(value.furnitureOverrides) ||
    !value.furnitureOverrides.every(isFurnitureOverride) ||
    (value.addedFurniture !== undefined &&
      (!Array.isArray(value.addedFurniture) || !value.addedFurniture.every(isFurniturePlacement))) ||
    !isDesignVisibility(value.visibility) ||
    !isOneOf(value.furniturePalette, FURNITURE_PALETTES) ||
    !isCameraByRoom(value.cameraByRoom)
  ) {
    return false;
  }
  const addedFurniture = value.addedFurniture ?? [];
  return (
    new Set(value.furnitureOverrides.map((override) => override.id)).size === value.furnitureOverrides.length &&
    new Set(addedFurniture.map((item) => item.id)).size === addedFurniture.length
  );
}

function migrateLegacyDesign(design: SavedDesignV1): SavedDesignV2 {
  return {
    ...design,
    schemaVersion: SAVED_DESIGN_SCHEMA_VERSION,
    furnitureOverrides: [],
    visibility: {
      hiddenObjectIds: [],
      hiddenCategories: [],
    },
    furniturePalette: 'warm',
    cameraByRoom: {},
  };
}

export function serializeDesign(design: SavedDesign): string {
  const persisted = design.schemaVersion === 1 ? migrateLegacyDesign(design) : design;
  if (!isSavedDesign(persisted)) throw new TypeError('התכנון אינו תואם לסכימת השמירה הנוכחית');
  return JSON.stringify(persisted);
}

export function deserializeDesign(serialized: string): SavedDesignV2 | null {
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (isSavedDesign(parsed)) return parsed;
    if (isLegacySavedDesign(parsed)) return migrateLegacyDesign(parsed);
    return null;
  } catch {
    return null;
  }
}

export function saveDesign(storage: DesignStorage, key: string, design: SavedDesign): void {
  storage.setItem(key, serializeDesign(design));
}

export function restoreDesign(storage: DesignStorage, key: string, apartmentId?: string): SavedDesignV2 | null {
  try {
    const serialized = storage.getItem(key);
    if (serialized === null) return null;
    const design = deserializeDesign(serialized);
    return design && (apartmentId === undefined || design.apartmentId === apartmentId) ? design : null;
  } catch {
    return null;
  }
}

export function clearDesign(storage: DesignStorage, key: string): void {
  storage.removeItem(key);
}
