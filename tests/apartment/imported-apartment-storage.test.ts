import { describe, expect, it } from 'vitest';
import type { Apartment } from '../../src/apartment/types';
import {
  IMPORTED_APARTMENTS_STORAGE_KEY,
  removeImportedApartment,
  restoreImportedApartments,
  saveImportedApartment,
} from '../../src/apartment/persistence/imported-apartments';
import { TIFERET_5_1 } from '../../src/apartment/data/tiferet';

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function importedApartment(id: string): Apartment {
  return {
    ...TIFERET_5_1,
    id,
    name: `דירה ${id}`,
    apartmentTypeId: undefined,
    source: { ...TIFERET_5_1.source, sheet: id },
  };
}

describe('imported apartment persistence', () => {
  it('stores multiple imported apartments and replaces an existing model immutably', () => {
    const storage = new MemoryStorage();
    const first = importedApartment('imported-a');
    const second = importedApartment('imported-b');

    saveImportedApartment(storage, first);
    saveImportedApartment(storage, second);
    saveImportedApartment(storage, { ...first, name: 'דירה א מעודכנת' });

    expect(restoreImportedApartments(storage).map((apartment) => apartment.id)).toEqual(['imported-a', 'imported-b']);
    expect(restoreImportedApartments(storage)[0]?.name).toBe('דירה א מעודכנת');
    expect(first.name).toBe('דירה imported-a');
  });

  it('removes only the requested apartment and ignores invalid persisted data', () => {
    const storage = new MemoryStorage();
    saveImportedApartment(storage, importedApartment('imported-a'));
    saveImportedApartment(storage, importedApartment('imported-b'));
    removeImportedApartment(storage, 'imported-a');

    expect(restoreImportedApartments(storage).map((apartment) => apartment.id)).toEqual(['imported-b']);

    storage.setItem(IMPORTED_APARTMENTS_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, apartments: [{}] }));
    expect(restoreImportedApartments(storage)).toEqual([]);
  });
});
