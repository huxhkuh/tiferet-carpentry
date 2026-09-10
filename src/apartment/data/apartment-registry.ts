import { TIFERET_5_1, TIFERET_PROJECT } from './tiferet';
import { restoreImportedApartments } from '../persistence/imported-apartments';
import { browserDesignStorage, readStoredPlanningDocument } from '../persistence/planning-document';
import type { Apartment } from '../types';

export function listAvailableApartments(): Apartment[] {
  const apartments = new Map<string, Apartment>();
  for (const apartment of [
    ...TIFERET_PROJECT.buildings.flatMap((building) => building.floors.flatMap((floor) => floor.apartments)),
    ...restoreImportedApartments(browserDesignStorage()),
  ]) {
    apartments.set(apartment.id, readStoredPlanningDocument(apartment.id)?.apartment ?? apartment);
  }
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (!key.startsWith('tiferet:document:v1:')) continue;
      const document = readStoredPlanningDocument(key.slice('tiferet:document:v1:'.length));
      if (document) apartments.set(document.apartment.id, document.apartment);
    }
  } catch {
    // Browsing built-in apartments remains available when storage is blocked.
  }
  return [...apartments.values()];
}

export function resolveApartment(id = TIFERET_5_1.id): Apartment | undefined {
  const builtIn = TIFERET_PROJECT.buildings
    .flatMap((building) => building.floors.flatMap((floor) => floor.apartments))
    .find((apartment) => apartment.id === id);
  return (
    readStoredPlanningDocument(id)?.apartment ??
    builtIn ??
    restoreImportedApartments(browserDesignStorage()).find((apartment) => apartment.id === id)
  );
}
