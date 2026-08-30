import type { Apartment } from '../types';
import { validateApartment } from '../validation/apartment';
import type { DesignStorage } from './design';

export const IMPORTED_APARTMENTS_STORAGE_KEY = 'tiferet:imported-apartments:v1';

interface ImportedApartmentEnvelope {
  schemaVersion: 1;
  apartments: Apartment[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function hasApartmentEnvelope(value: unknown): value is Apartment {
  if (!isRecord(value) || !isRecord(value.source)) return false;
  return (
    (typeof value.id !== 'string' ||
      typeof value.name !== 'string' ||
      typeof value.type !== 'string' ||
      !Array.isArray(value.rooms) ||
      !Array.isArray(value.walls) ||
      !Array.isArray(value.fixedElements)) === false
  );
}

function isApartmentCandidate(value: unknown): value is Apartment {
  if (!hasApartmentEnvelope(value)) return false;
  try {
    return validateApartment(value);
  } catch {
    return false;
  }
}

export function restoreImportedApartments(storage: DesignStorage): Apartment[] {
  const serialized = storage.getItem(IMPORTED_APARTMENTS_STORAGE_KEY);
  if (serialized === null) return [];
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!isRecord(parsed) || parsed.schemaVersion !== 1 || !Array.isArray(parsed.apartments)) return [];
    return parsed.apartments.filter(isApartmentCandidate);
  } catch {
    return [];
  }
}

function persist(storage: DesignStorage, apartments: readonly Apartment[]): void {
  const envelope: ImportedApartmentEnvelope = { schemaVersion: 1, apartments: [...apartments] };
  storage.setItem(IMPORTED_APARTMENTS_STORAGE_KEY, JSON.stringify(envelope));
}

export function saveImportedApartment(storage: DesignStorage, apartment: Apartment): void {
  if (!validateApartment(apartment)) throw new TypeError('מודל הדירה המיובא אינו תקין');
  const current = restoreImportedApartments(storage);
  const existingIndex = current.findIndex((candidate) => candidate.id === apartment.id);
  const next =
    existingIndex < 0
      ? [...current, apartment]
      : current.map((candidate) => (candidate.id === apartment.id ? apartment : candidate));
  persist(storage, next);
}

export function removeImportedApartment(storage: DesignStorage, apartmentId: string): void {
  persist(
    storage,
    restoreImportedApartments(storage).filter((apartment) => apartment.id !== apartmentId),
  );
}
