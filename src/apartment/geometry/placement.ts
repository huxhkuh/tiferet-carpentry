import type { Apartment, CabinetPlacement, Room } from '../types';
import { polygonCentroid } from './wall-frame';

export {
  inwardNormalForRoom,
  pointAlongWall,
  pointInPolygon,
  polygonCentroid,
  wallAngle,
  wallFrame,
  wallLength,
  wallTangent,
} from './wall-frame';
export { cabinetFootprint, placementTransform, placementTransformForRoom } from './placement-geometry';
export {
  findFirstFit,
  getAvailableWallSegments,
  getUsableWallIntervals,
  isPlacementValid,
  occupiedWallIntervals,
  validatePlacement,
} from './intervals';
export type { WallAvailabilityOptions, WallSegment } from './intervals';
export { getApartmentValidationIssues, validateApartment, validateProject } from '../validation/apartment';
export {
  clearDesign,
  deserializeDesign,
  isCabinetConfig,
  isCabinetPlacement,
  isSavedDesign,
  restoreDesign,
  saveDesign,
  SAVED_DESIGN_SCHEMA_VERSION,
  serializeDesign,
} from '../persistence/design';
export {
  createCabinetPlacement,
  createWardrobeConfig,
  deriveCabinet,
  derivePlacedCabinet,
  updateCabinetPlacement,
} from '../cabinet/adapter';

/** Compatibility helper retained for consumers of the initial planner prototype. */
export const roomCentroid = (room: Room) => polygonCentroid(room.polygon);

export const findWall = (apartment: Apartment, placement: CabinetPlacement) =>
  apartment.walls.find((wall) => wall.id === placement.wallId);
