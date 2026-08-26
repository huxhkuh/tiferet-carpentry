import type { CabinetConfig } from '../../engine/types';
import type { CabinetPlacement, SavedDesign, SavedDesignMetadata } from '../types';

export const SAVED_DESIGN_SCHEMA_VERSION = 1 as const;

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

export function isSavedDesign(value: unknown): value is SavedDesign {
  if (!isRecord(value) || !Array.isArray(value.placements)) return false;
  if (
    value.schemaVersion !== SAVED_DESIGN_SCHEMA_VERSION ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.apartmentId) ||
    !isNonEmptyString(value.name) ||
    !isNonEmptyString(value.updatedAt) ||
    !Number.isFinite(Date.parse(value.updatedAt)) ||
    (value.metadata !== undefined && !isSavedDesignMetadata(value.metadata)) ||
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

export function serializeDesign(design: SavedDesign): string {
  if (!isSavedDesign(design)) throw new TypeError('התכנון אינו תואם לסכימת השמירה הנוכחית');
  return JSON.stringify(design);
}

export function deserializeDesign(serialized: string): SavedDesign | null {
  try {
    const parsed: unknown = JSON.parse(serialized);
    return isSavedDesign(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveDesign(storage: DesignStorage, key: string, design: SavedDesign): void {
  storage.setItem(key, serializeDesign(design));
}

export function restoreDesign(storage: DesignStorage, key: string, apartmentId?: string): SavedDesign | null {
  const serialized = storage.getItem(key);
  if (serialized === null) return null;
  const design = deserializeDesign(serialized);
  return design && (apartmentId === undefined || design.apartmentId === apartmentId) ? design : null;
}

export function clearDesign(storage: DesignStorage, key: string): void {
  storage.removeItem(key);
}
