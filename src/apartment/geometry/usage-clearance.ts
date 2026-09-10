import type { Apartment, CabinetPlacement, FurniturePlacement } from '../types';
import { furnitureFootprint } from '../furniture/geometry';
import { cabinetFootprint } from './placement-geometry';
import { polygonContainsPolygon, polygonsOverlap } from './polygon';
import { verticalBoundsOverlap } from './intervals';
import { cabinetOpeningEnvelopes } from './opening-envelopes';

/** Usage warnings are separate from body collisions; no invented circulation standard. */
export function cabinetUsageWarnings(
  apartment: Apartment,
  cabinet: CabinetPlacement,
  placements: readonly CabinetPlacement[],
  furniture: readonly FurniturePlacement[],
): string[] {
  const room = apartment.rooms.find((item) => item.id === cabinet.roomId);
  const wall = apartment.walls.find((item) => item.id === cabinet.wallId);
  if (!room || !wall) return ['לא ניתן לבדוק מרחב שימוש: חסר חדר או קיר'];
  const warnings: string[] = [];
  if (room.ceilingHeight === undefined) warnings.push('גובה התקרה אינו מאומת במקור; יש לבדוק התאמה אנכית במדידה');
  if (
    wall.openings.some(
      (opening) => opening.height === undefined || (opening.kind === 'window' && opening.sillHeight === undefined),
    )
  )
    warnings.push('גובה פתח או אדן חסר במקור; לא ניתן לאשר התאמה מלאה לפתחים');
  const envelopes = cabinetOpeningEnvelopes(cabinet, wall, room);
  if (envelopes.length === 0) return warnings;
  warnings.push('בדיקת פתיחה ראשונית: דלתות עד 90° ומשיכת מגירות באורך הקופסה; יש לאמת צד ציר וטווח פרזול');
  if (envelopes.some((envelope) => !polygonContainsPolygon(room.polygon, envelope.polygon)))
    warnings.push('אין די מקום בתוך החדר למעטפת פתיחה מלאה של הדלתות או המגירות');
  for (const item of furniture) {
    if (
      item.roomId === room.id &&
      item.kind !== 'rug' &&
      envelopes.some(
        (envelope) =>
          verticalBoundsOverlap(item.elevation, item.height, envelope.elevation, envelope.height) &&
          polygonsOverlap(envelope.polygon, furnitureFootprint(item)),
      )
    )
      warnings.push(`יש לבדוק את פתיחת הדלתות והמגירות מול ${item.label}`);
  }
  for (const other of placements) {
    if (
      other.id === cabinet.id ||
      other.roomId !== room.id ||
      !verticalBoundsOverlap(other.elevation, other.height, cabinet.elevation, cabinet.height)
    )
      continue;
    const otherWall = apartment.walls.find((item) => item.id === other.wallId);
    if (
      otherWall &&
      envelopes.some(
        (envelope) =>
          verticalBoundsOverlap(other.elevation, other.height, envelope.elevation, envelope.height) &&
          polygonsOverlap(
            envelope.polygon,
            cabinetFootprint(otherWall, other.distanceFromWallStart, other.width, other.depth, room),
          ),
      )
    )
      warnings.push('מעטפת הפתיחה נפגשת עם ארון אחר');
  }
  return [...new Set(warnings)];
}
