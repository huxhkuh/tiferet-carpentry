import type { Apartment, Point, Project } from '../types';
import { wallLength } from '../geometry/wall-frame';

export type ApartmentValidationCode =
  | 'INVALID_APARTMENT_ID'
  | 'INVALID_APARTMENT_NAME'
  | 'EMPTY_ROOMS'
  | 'DUPLICATE_ENTITY_ID'
  | 'INVALID_POINT'
  | 'INVALID_POLYGON'
  | 'ZERO_LENGTH_WALL'
  | 'INVALID_OPENING'
  | 'UNKNOWN_WALL_REFERENCE'
  | 'DUPLICATE_WALL_REFERENCE'
  | 'UNKNOWN_ROOM_REFERENCE'
  | 'INVALID_FURNITURE'
  | 'INVALID_SOURCE';

export interface ApartmentValidationIssue {
  code: ApartmentValidationCode;
  entityId?: string;
  message: string;
}

const isNonEmptyString = (value: string): boolean => value.trim().length > 0;
const isFinitePoint = (point: Point): boolean => Number.isFinite(point.x) && Number.isFinite(point.y);

function duplicateIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return [...duplicates];
}

export function getApartmentValidationIssues(apartment: Apartment): ApartmentValidationIssue[] {
  const issues: ApartmentValidationIssue[] = [];
  if (!isNonEmptyString(apartment.id)) {
    issues.push({ code: 'INVALID_APARTMENT_ID', message: 'מזהה הדירה חסר' });
  }
  if (!isNonEmptyString(apartment.name)) {
    issues.push({ code: 'INVALID_APARTMENT_NAME', entityId: apartment.id, message: 'שם הדירה חסר' });
  }
  if (apartment.rooms.length === 0) {
    issues.push({ code: 'EMPTY_ROOMS', entityId: apartment.id, message: 'בדירה לא הוגדרו חדרים' });
  }

  const entityIds = [
    apartment.id,
    ...apartment.rooms.map((room) => room.id),
    ...apartment.walls.map((wall) => wall.id),
    ...apartment.walls.flatMap((wall) => wall.openings.map((opening) => opening.id)),
    ...apartment.fixedElements.map((element) => element.id),
    ...(apartment.wallMasses ?? []).map((mass) => mass.id),
    ...(apartment.furniture ?? []).map((item) => item.id),
  ];
  for (const id of duplicateIds(entityIds)) {
    issues.push({ code: 'DUPLICATE_ENTITY_ID', entityId: id, message: `המזהה ${id} מופיע יותר מפעם אחת` });
  }

  const wallIds = new Set(apartment.walls.map((wall) => wall.id));
  const roomIds = new Set(apartment.rooms.map((room) => room.id));
  for (const wall of apartment.walls) {
    if (!isFinitePoint(wall.start) || !isFinitePoint(wall.end)) {
      issues.push({ code: 'INVALID_POINT', entityId: wall.id, message: 'נקודות הקיר חייבות להיות סופיות' });
      continue;
    }
    const length = wallLength(wall);
    if (!Number.isFinite(length) || length <= 0) {
      issues.push({ code: 'ZERO_LENGTH_WALL', entityId: wall.id, message: 'אורך הקיר חייב להיות חיובי' });
      continue;
    }
    for (const opening of wall.openings) {
      if (
        !Number.isFinite(opening.offset) ||
        !Number.isFinite(opening.width) ||
        opening.offset < 0 ||
        opening.width <= 0 ||
        opening.offset + opening.width > length
      ) {
        issues.push({
          code: 'INVALID_OPENING',
          entityId: opening.id,
          message: 'הפתח חייב להיות כולו בתוך גבולות הקיר',
        });
      }
    }
  }

  for (const room of apartment.rooms) {
    if (room.polygon.length < 3) {
      issues.push({ code: 'INVALID_POLYGON', entityId: room.id, message: 'חדר חייב לכלול מצולע בן שלוש נקודות לפחות' });
    }
    if (!room.polygon.every(isFinitePoint)) {
      issues.push({ code: 'INVALID_POINT', entityId: room.id, message: 'נקודות החדר חייבות להיות סופיות' });
    }
    if (duplicateIds(room.wallIds).length > 0) {
      issues.push({
        code: 'DUPLICATE_WALL_REFERENCE',
        entityId: room.id,
        message: 'רשימת הקירות בחדר מכילה הפניה כפולה',
      });
    }
    for (const wallId of room.wallIds) {
      if (!wallIds.has(wallId)) {
        issues.push({
          code: 'UNKNOWN_WALL_REFERENCE',
          entityId: room.id,
          message: `החדר מפנה לקיר לא מוכר: ${wallId}`,
        });
      }
    }
  }

  for (const mass of apartment.wallMasses ?? []) {
    const source = mass.sourcePdfRect;
    const sourceIsValid =
      source === undefined ||
      ([source.x0, source.x1, source.top, source.bottom].every(Number.isFinite) &&
        source.x1 > source.x0 &&
        source.bottom > source.top);
    if (mass.polygon.length < 3 || !mass.polygon.every(isFinitePoint) || !sourceIsValid) {
      issues.push({
        code: 'INVALID_POLYGON',
        entityId: mass.id,
        message: 'מסת קיר ממקור התוכנית חייבת לכלול מצולע וקואורדינטות מקור תקינים',
      });
    }
  }

  for (const element of apartment.fixedElements) {
    if (!roomIds.has(element.roomId)) {
      issues.push({
        code: 'UNKNOWN_ROOM_REFERENCE',
        entityId: element.id,
        message: `האלמנט מפנה לחדר לא מוכר: ${element.roomId}`,
      });
    }
    if (element.polygon.length < 3 || !element.polygon.every(isFinitePoint)) {
      issues.push({ code: 'INVALID_POLYGON', entityId: element.id, message: 'מכשול קבוע חייב לכלול מצולע תקין' });
    }
  }

  for (const item of apartment.furniture ?? []) {
    if (!roomIds.has(item.roomId)) {
      issues.push({
        code: 'UNKNOWN_ROOM_REFERENCE',
        entityId: item.id,
        message: `פריט הריהוט מפנה לחדר לא מוכר: ${item.roomId}`,
      });
    }
    const dimensions = [item.x, item.y, item.width, item.depth, item.height, item.elevation, item.rotation];
    if (
      !isNonEmptyString(item.id) ||
      !isNonEmptyString(item.label) ||
      !dimensions.every(Number.isFinite) ||
      item.width <= 0 ||
      item.depth <= 0 ||
      item.height <= 0 ||
      item.elevation < 0
    ) {
      issues.push({
        code: 'INVALID_FURNITURE',
        entityId: item.id,
        message: 'מיקום ומידות פריט הריהוט חייבים להיות תקינים וחיוביים',
      });
    }
  }

  const source = apartment.source;
  if (
    !isNonEmptyString(source.project) ||
    !isNonEmptyString(source.building) ||
    !Number.isInteger(source.floor) ||
    !isNonEmptyString(source.sheet) ||
    source.sourceType !== 'sales-plan-pdf'
  ) {
    issues.push({ code: 'INVALID_SOURCE', entityId: apartment.id, message: 'פרטי מקור תוכנית הדירה אינם תקינים' });
  }
  return issues;
}

export const validateApartment = (apartment: Apartment): boolean =>
  getApartmentValidationIssues(apartment).length === 0;

export function validateProject(project: Project): boolean {
  const apartmentTypeIds = new Set(project.apartmentTypes.map((type) => type.id));
  const ids = [
    project.id,
    ...project.apartmentTypes.map((type) => type.id),
    ...project.buildings.flatMap((building) => [
      building.id,
      ...building.floors.flatMap((floor) => [floor.id, ...floor.apartments.map((apartment) => apartment.id)]),
    ]),
  ];
  return (
    isNonEmptyString(project.id) &&
    isNonEmptyString(project.name) &&
    duplicateIds(ids).length === 0 &&
    project.buildings.every(
      (building) =>
        isNonEmptyString(building.id) &&
        isNonEmptyString(building.name) &&
        building.floors.every(
          (floor) =>
            isNonEmptyString(floor.id) &&
            Number.isInteger(floor.number) &&
            floor.apartments.every(
              (apartment) =>
                validateApartment(apartment) &&
                (apartment.apartmentTypeId === undefined || apartmentTypeIds.has(apartment.apartmentTypeId)),
            ),
        ),
    )
  );
}
