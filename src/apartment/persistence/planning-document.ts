import { TIFERET_5_1 } from '../data/tiferet';
import type { Apartment, SavedDesignV3 } from '../types';
import { validateApartment } from '../validation/apartment';
import { deserializeDesign, restoreDesign, serializeDesign, type DesignStorage } from './design';
import {
  createDesignLibrary,
  deserializeDesignLibrary,
  restoreDesignLibrary,
  serializeDesignLibrary,
  type SavedDesignLibrary,
} from './design-library';

/** A single atomic storage value owns the draft, named versions and architectural source. */
export interface PlanningDocument {
  schemaVersion: 1;
  apartment: Apartment;
  draft: SavedDesignV3 | null;
  library: SavedDesignLibrary;
}

const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;
const designStorageKey = (id: string): string =>
  id === TIFERET_5_1.id ? 'tiferet:design:5-1' : `tiferet:design:${id}`;
const designLibraryStorageKey = (id: string): string => `tiferet:design-library:${id}`;
const documentKey = (id: string): string => `tiferet:document:v1:${id}`;
const unsavedDrafts = new Map<string, PlanningDocument>();

/** Keep a recoverable copy across SPA navigation when persistent storage is unavailable. */
export function preserveUnsavedDraft(document: PlanningDocument): void {
  unsavedDrafts.set(document.apartment.id, document);
}

export function browserDesignStorage(): DesignStorage {
  // Defer accessing localStorage until inside each caller's error boundary.
  return {
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
    removeItem: (key) => window.localStorage.removeItem(key),
  };
}

export function deserializePlanningDocument(serialized: string): PlanningDocument | null {
  if (serialized.length > MAX_DOCUMENT_BYTES) return null;
  try {
    const value: unknown = JSON.parse(serialized);
    if (
      typeof value !== 'object' ||
      value === null ||
      !('schemaVersion' in value) ||
      value.schemaVersion !== 1 ||
      !('apartment' in value) ||
      !('draft' in value) ||
      !('library' in value)
    )
      return null;
    const apartment = value.apartment as Apartment;
    if (!validateApartment(apartment)) return null;
    const draft = value.draft === null ? null : deserializeDesign(JSON.stringify(value.draft));
    const library = deserializeDesignLibrary(JSON.stringify(value.library), apartment.id);
    if (!library || (value.draft !== null && !draft) || (draft && draft.apartmentId !== apartment.id)) return null;
    return { schemaVersion: 1, apartment, draft, library };
  } catch {
    return null;
  }
}

export function serializePlanningDocument(document: PlanningDocument): string {
  const serialized = JSON.stringify(document);
  if (!deserializePlanningDocument(serialized)) throw new TypeError('מסמך התכנון אינו תקין או גדול מדי');
  return serialized;
}

export function restorePlanningDocument(storage: DesignStorage, apartment: Apartment): PlanningDocument {
  const recovery = unsavedDrafts.get(apartment.id);
  if (recovery) return recovery;
  try {
    const serialized = storage.getItem(documentKey(apartment.id));
    if (serialized !== null) {
      const document = deserializePlanningDocument(serialized);
      if (document?.apartment.id === apartment.id) return document;
    }
  } catch {
    /* Legacy recovery below also handles unavailable storage. */
  }
  return {
    schemaVersion: 1,
    apartment,
    draft: restoreDesign(storage, designStorageKey(apartment.id), apartment.id),
    library:
      restoreDesignLibrary(storage, designLibraryStorageKey(apartment.id), apartment.id) ??
      createDesignLibrary(apartment.id),
  };
}

export function savePlanningDocument(storage: DesignStorage, document: PlanningDocument): void {
  // Commit the authoritative value once. A failed write leaves the previous document intact.
  storage.setItem(documentKey(document.apartment.id), serializePlanningDocument(document));
  unsavedDrafts.delete(document.apartment.id);
  // Compatibility mirrors can fail independently; current readers always prefer the atomic document.
  try {
    if (document.draft) storage.setItem(designStorageKey(document.apartment.id), serializeDesign(document.draft));
    else storage.removeItem(designStorageKey(document.apartment.id));
    storage.setItem(designLibraryStorageKey(document.apartment.id), serializeDesignLibrary(document.library));
  } catch {
    /* A mirror is not the source of truth. */
  }
}

export function readStoredPlanningDocument(id: string): PlanningDocument | null {
  const recovery = unsavedDrafts.get(id);
  if (recovery) return recovery;
  try {
    const text = browserDesignStorage().getItem(documentKey(id));
    return text ? deserializePlanningDocument(text) : null;
  } catch {
    return null;
  }
}
