import type { Apartment } from '../types';

/** Keeps the legal/title-block identity separate from the drawing-sheet identifier. */
export function apartmentSourceLabel(apartment: Apartment): string {
  const sourceApartmentNumber = apartment.source.sourceApartmentNumber?.trim();
  if (!sourceApartmentNumber) return apartment.name;
  return `דירה ${sourceApartmentNumber} · גיליון ${apartment.source.sheet}`;
}
