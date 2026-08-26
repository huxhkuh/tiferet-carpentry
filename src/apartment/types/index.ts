import type { CabinetConfig } from '../../engine/types';

/** Stable identifier persisted in apartment definitions and customer designs. */
export type EntityId = string;

/** A two-dimensional point measured in millimetres. */
export interface Point {
  x: number;
  y: number;
}

interface OpeningBase {
  id: EntityId;
  offset: number;
  width: number;
  height?: number;
}

export interface Door extends OpeningBase {
  kind: 'door';
  swing?: 'left' | 'right' | 'sliding';
}

export interface Window extends OpeningBase {
  kind: 'window';
  sillHeight?: number;
}

export type Opening = Door | Window;

export interface FixedObstacle {
  id: EntityId;
  roomId: EntityId;
  kind: 'shaft' | 'laundry' | 'plumbing' | 'balcony-void' | 'column' | 'utility';
  label: string;
  polygon: Point[];
  height?: number;
}

/** Backwards-compatible name used by the first normalized Tiferet data file. */
export type FixedElement = FixedObstacle;

export interface Wall {
  id: EntityId;
  start: Point;
  end: Point;
  openings: Opening[];
  thickness?: number;
  height?: number;
}

export interface SourcePdfRect {
  x0: number;
  x1: number;
  top: number;
  bottom: number;
}

/** Filled structural wall geometry traced from the source drawing. */
export interface WallMass {
  id: EntityId;
  polygon: Point[];
  sourcePdfRect?: SourcePdfRect;
}

export interface Room {
  id: EntityId;
  name: string;
  polygon: Point[];
  wallIds: EntityId[];
}

export type FurnitureKind =
  | 'single-bed'
  | 'double-bed'
  | 'nightstand'
  | 'desk'
  | 'bookshelf'
  | 'sofa'
  | 'coffee-table'
  | 'rug'
  | 'media-console'
  | 'dining-table'
  | 'dining-chair'
  | 'plant'
  | 'kitchen-base-run'
  | 'kitchen-wall-run'
  | 'refrigerator'
  | 'oven'
  | 'sink'
  | 'vanity'
  | 'toilet'
  | 'shower'
  | 'bathtub'
  | 'washer'
  | 'dryer';

export type FurniturePalette = 'warm' | 'light' | 'sage';

/** A reusable furnishing placed freely on the apartment floor, measured in millimetres. */
export interface FurniturePlacement {
  id: EntityId;
  roomId: EntityId;
  kind: FurnitureKind;
  label: string;
  /** Centre point in the apartment coordinate system. */
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  elevation: number;
  /** Clockwise rotation around the centre, in radians. */
  rotation: number;
  color?: string;
  accentColor?: string;
}

export interface ApartmentSource {
  project: string;
  building: string;
  floor: number;
  sheet: string;
  sourceType: 'sales-plan-pdf';
  sourceFile?: string;
  sourceUrl?: string;
  sourceFileId?: string;
  sourceSha256?: string;
  sourcePage?: number;
  pageWidthPoints?: number;
  pageHeightPoints?: number;
  sourcePlanBoundsPoints?: SourcePdfRect;
  modelingMethod?: 'automatic' | 'semi-automatic' | 'manually-normalized';
  modelingNotes?: string;
}

export interface ApartmentType {
  id: EntityId;
  name: string;
  description?: string;
  mirroredFromId?: EntityId;
}

export interface Apartment {
  id: EntityId;
  name: string;
  /** Human-readable legacy label retained for compatibility with the existing data/UI. */
  type: string;
  apartmentTypeId?: EntityId;
  rooms: Room[];
  walls: Wall[];
  wallMasses?: WallMass[];
  fixedElements: FixedObstacle[];
  furniture?: FurniturePlacement[];
  source: ApartmentSource;
}

export interface Floor {
  id: EntityId;
  number: number;
  apartments: Apartment[];
}

export interface Building {
  id: EntityId;
  name: string;
  type?: string;
  floors: Floor[];
}

export interface Project {
  id: EntityId;
  name: string;
  apartmentTypes: ApartmentType[];
  buildings: Building[];
}

export interface CabinetPlacement {
  id: EntityId;
  apartmentId: EntityId;
  roomId: EntityId;
  wallId: EntityId;
  distanceFromWallStart: number;
  elevation: number;
  /** Radians; points from the wall towards the room interior. */
  orientation: number;
  width: number;
  depth: number;
  height: number;
  cabinetConfig: CabinetConfig;
}

export interface SavedDesignMetadata {
  customerName?: string;
  notes?: string;
}

export interface SavedDesign {
  schemaVersion: 1;
  id: EntityId;
  apartmentId: EntityId;
  name: string;
  updatedAt: string;
  placements: CabinetPlacement[];
  metadata?: SavedDesignMetadata;
}
