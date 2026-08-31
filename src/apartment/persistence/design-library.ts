import type { SavedDesignV2 } from '../types';
import type { DesignStorage } from './design';
import { isSavedDesign } from './design';

export const DESIGN_LIBRARY_SCHEMA_VERSION = 1 as const;

export interface SavedDesignLibrary {
  schemaVersion: typeof DESIGN_LIBRARY_SCHEMA_VERSION;
  apartmentId: string;
  activeDesignId: string | null;
  designs: SavedDesignV2[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function createDesignLibrary(apartmentId: string): SavedDesignLibrary {
  if (apartmentId.trim().length === 0) throw new TypeError('מזהה הדירה חסר');
  return {
    schemaVersion: DESIGN_LIBRARY_SCHEMA_VERSION,
    apartmentId,
    activeDesignId: null,
    designs: [],
  };
}

export function isSavedDesignLibrary(value: unknown): value is SavedDesignLibrary {
  if (
    !isRecord(value) ||
    value.schemaVersion !== DESIGN_LIBRARY_SCHEMA_VERSION ||
    typeof value.apartmentId !== 'string' ||
    value.apartmentId.trim().length === 0 ||
    !Array.isArray(value.designs) ||
    !value.designs.every(isSavedDesign) ||
    (value.activeDesignId !== null && typeof value.activeDesignId !== 'string')
  ) {
    return false;
  }
  const designs = value.designs;
  const designIds = designs.map((design) => design.id);
  return (
    new Set(designIds).size === designIds.length &&
    designs.every((design) => design.apartmentId === value.apartmentId) &&
    (value.activeDesignId === null || designIds.includes(value.activeDesignId))
  );
}

function newestFirst(designs: readonly SavedDesignV2[]): SavedDesignV2[] {
  return [...designs].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

export function addDesignVersion(library: SavedDesignLibrary, design: SavedDesignV2): SavedDesignLibrary {
  if (!isSavedDesignLibrary(library)) throw new TypeError('ספריית התכנונים אינה תקינה');
  if (!isSavedDesign(design) || design.apartmentId !== library.apartmentId) {
    throw new TypeError('גרסת התכנון אינה תואמת לדירה');
  }
  const retained = library.designs.filter((candidate) => candidate.id !== design.id);
  return {
    ...library,
    activeDesignId: design.id,
    designs: newestFirst([...retained, design]),
  };
}

export function removeDesignVersion(library: SavedDesignLibrary, designId: string): SavedDesignLibrary {
  if (!isSavedDesignLibrary(library)) throw new TypeError('ספריית התכנונים אינה תקינה');
  const designs = library.designs.filter((design) => design.id !== designId);
  return {
    ...library,
    activeDesignId: library.activeDesignId === designId ? (designs[0]?.id ?? null) : library.activeDesignId,
    designs,
  };
}

export function selectDesignVersion(library: SavedDesignLibrary, designId: string): SavedDesignLibrary {
  if (!isSavedDesignLibrary(library) || !library.designs.some((design) => design.id === designId)) {
    throw new TypeError('גרסת התכנון אינה קיימת בספרייה');
  }
  return { ...library, activeDesignId: designId };
}

export function serializeDesignLibrary(library: SavedDesignLibrary): string {
  if (!isSavedDesignLibrary(library)) throw new TypeError('ספריית התכנונים אינה תואמת לסכימה');
  return JSON.stringify(library);
}

export function deserializeDesignLibrary(serialized: string, apartmentId?: string): SavedDesignLibrary | null {
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!isSavedDesignLibrary(parsed)) return null;
    return apartmentId === undefined || parsed.apartmentId === apartmentId ? parsed : null;
  } catch {
    return null;
  }
}

export function saveDesignLibrary(storage: DesignStorage, key: string, library: SavedDesignLibrary): void {
  storage.setItem(key, serializeDesignLibrary(library));
}

export function restoreDesignLibrary(
  storage: DesignStorage,
  key: string,
  apartmentId: string,
): SavedDesignLibrary | null {
  try {
    const serialized = storage.getItem(key);
    return serialized === null ? null : deserializeDesignLibrary(serialized, apartmentId);
  } catch {
    return null;
  }
}
