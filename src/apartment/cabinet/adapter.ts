import { computeDimensions } from '../../engine/dimensions';
import { DEFAULT_CONFIG, WARDROBE_DEFAULTS } from '../../engine/materials';
import { generateParts } from '../../engine/parts';
import type { CabinetConfig, DerivedDimensions, Part, ValidationIssue } from '../../engine/types';
import { validateConfig } from '../../engine/validation';
import { cabinetFootprint, placementTransformForRoom } from '../geometry/placement-geometry';
import { findFirstFit, validatePlacement } from '../geometry/intervals';
import type { Apartment, CabinetPlacement, Point, Room, Wall } from '../types';

export interface CabinetDerivation {
  config: CabinetConfig;
  dimensions: DerivedDimensions;
  parts: Part[];
  issues: ValidationIssue[];
  hasErrors: boolean;
}

export interface PlacedCabinetDerivation extends CabinetDerivation {
  transform: { x: number; y: number; orientation: number };
  footprint: Point[];
}

export interface CreateCabinetPlacementInput {
  apartment: Apartment;
  room: Room;
  wall: Wall;
  cabinetConfig?: Partial<CabinetConfig>;
  distanceFromWallStart?: number;
  elevation?: number;
  existingPlacements?: readonly CabinetPlacement[];
  id?: string;
}

export function createWardrobeConfig(overrides: Partial<CabinetConfig> = {}): CabinetConfig {
  const config: CabinetConfig = {
    ...DEFAULT_CONFIG,
    ...WARDROBE_DEFAULTS,
    lang: 'he',
    ...overrides,
    furnitureType: overrides.furnitureType ?? 'wardrobe',
  };
  const adjusted: CabinetConfig = {
    ...config,
    shelfCentreSupports: overrides.shelfCentreSupports ?? (config.width > 1200 ? 1 : config.shelfCentreSupports),
  };
  return adjusted;
}

export function deriveCabinet(config: CabinetConfig): CabinetDerivation {
  const issues = validateConfig(config);
  return {
    config,
    dimensions: computeDimensions(config),
    parts: generateParts(config),
    issues,
    hasErrors: issues.some((issue) => issue.severity === 'error'),
  };
}

function assertApartmentRelationships(apartment: Apartment, room: Room, wall: Wall): void {
  if (!apartment.rooms.some((candidate) => candidate.id === room.id)) {
    throw new RangeError('החדר אינו שייך לדירה שנבחרה');
  }
  if (!apartment.walls.some((candidate) => candidate.id === wall.id) || !room.wallIds.includes(wall.id)) {
    throw new RangeError('הקיר אינו שייך לחדר שנבחר');
  }
}

function assertManufacturable(derivation: CabinetDerivation): void {
  const error = derivation.issues.find((issue) => issue.severity === 'error');
  if (error) throw new RangeError(error.message.he);
}

export function createCabinetPlacement({
  apartment,
  room,
  wall,
  cabinetConfig = {},
  distanceFromWallStart,
  elevation = 0,
  existingPlacements = [],
  id = globalThis.crypto.randomUUID(),
}: CreateCabinetPlacementInput): CabinetPlacement {
  assertApartmentRelationships(apartment, room, wall);
  if (!Number.isFinite(elevation) || elevation < 0) throw new RangeError('גובה ההצבה חייב להיות מספר לא שלילי');
  const config = createWardrobeConfig(cabinetConfig);
  const derivation = deriveCabinet(config);
  assertManufacturable(derivation);
  const scopedPlacements = existingPlacements.filter(
    (placement) => placement.apartmentId === apartment.id && placement.roomId === room.id,
  );
  const resolvedDistance = distanceFromWallStart ?? findFirstFit(wall, config.width, { placements: scopedPlacements });
  if (resolvedDistance === null) throw new RangeError('לא נמצא בקיר מקטע פנוי המתאים לרוחב הארון');
  const placementError = validatePlacement(wall, config.width, resolvedDistance, scopedPlacements);
  if (placementError) throw new RangeError(placementError);
  const transform = placementTransformForRoom(wall, room, resolvedDistance);
  return {
    id,
    apartmentId: apartment.id,
    roomId: room.id,
    wallId: wall.id,
    distanceFromWallStart: resolvedDistance,
    elevation,
    orientation: transform.orientation,
    width: config.width,
    depth: config.depth,
    height: config.height,
    cabinetConfig: config,
  };
}

export function derivePlacedCabinet(placement: CabinetPlacement, wall: Wall, room: Room): PlacedCabinetDerivation {
  const derivation = deriveCabinet(placement.cabinetConfig);
  return {
    ...derivation,
    transform: placementTransformForRoom(wall, room, placement.distanceFromWallStart),
    footprint: cabinetFootprint(wall, placement.distanceFromWallStart, placement.width, placement.depth, room),
  };
}

export function updateCabinetPlacement(
  placement: CabinetPlacement,
  patch: Partial<CabinetConfig>,
  wall: Wall,
  room: Room,
  existingPlacements: readonly CabinetPlacement[] = [],
): CabinetPlacement {
  const config = { ...placement.cabinetConfig, ...patch };
  const derivation = deriveCabinet(config);
  assertManufacturable(derivation);
  const scopedPlacements = existingPlacements.filter(
    (candidate) => candidate.apartmentId === placement.apartmentId && candidate.roomId === placement.roomId,
  );
  const placementError = validatePlacement(
    wall,
    config.width,
    placement.distanceFromWallStart,
    scopedPlacements,
    placement.id,
  );
  if (placementError) throw new RangeError(placementError);
  const transform = placementTransformForRoom(wall, room, placement.distanceFromWallStart);
  return {
    ...placement,
    orientation: transform.orientation,
    width: config.width,
    depth: config.depth,
    height: config.height,
    cabinetConfig: config,
  };
}
