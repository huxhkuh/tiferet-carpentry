import { validateCabinetInRoom, validateFurnitureMove } from '../geometry/scene-collision';
import { applyFurnitureOverrides } from './design-state';
import type { Apartment, SavedDesignV3 } from '../types';

export function designValidationError(apartment: Apartment, design: SavedDesignV3): string | null {
  if (design.apartmentId !== apartment.id) return 'התכנון שייך לדירה אחרת';
  const originals = apartment.furniture ?? [];
  const added = design.addedFurniture ?? [];
  const ids = [...originals, ...added].map((item) => item.id);
  if (new Set(ids).size !== ids.length) return 'מזהה הריהוט מתנגש בפריט קיים בדירה';
  if (design.furnitureOverrides.some((item) => !ids.includes(item.id))) return 'שינוי הריהוט מפנה לפריט שאינו קיים';
  const objectIds = new Set([...ids, ...design.placements.map((item) => item.id)]);
  if (design.visibility.lockedObjectIds?.some((id) => !objectIds.has(id))) return 'הנעילה מפנה לפריט שאינו קיים';
  const furniture = applyFurnitureOverrides([...originals, ...added], design.furnitureOverrides);
  const changedIds = new Set([...added, ...design.furnitureOverrides].map((item) => item.id));
  for (const item of furniture) {
    const room = apartment.rooms.find((candidate) => candidate.id === item.roomId);
    if (!room) return 'החדר של פריט הריהוט אינו קיים בתכנית';
    if (!changedIds.has(item.id)) continue;
    const error = validateFurnitureMove(room, item, design.placements, apartment, furniture);
    if (error) return error;
  }
  for (const item of design.placements) {
    const room = apartment.rooms.find((candidate) => candidate.id === item.roomId);
    const wall = apartment.walls.find((candidate) => candidate.id === item.wallId);
    if (!room || !wall || !room.wallIds.includes(wall.id)) return 'הארון מפנה לחדר או לקיר שאינם קיימים';
    const error = validateCabinetInRoom(apartment, room, wall, item, design.placements, furniture);
    if (error) return error;
  }
  return null;
}
