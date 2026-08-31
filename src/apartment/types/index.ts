import type { CabinetConfig } from '../../engine/types';

/** Stable identifier persisted in apartment definitions and customer designs. */
export type EntityId = string;

/** A two-dimensional point measured in millimetres. */
export interface Point {
  x: number;
  y: number;
}

export type MeasurementBasis = 'construction' | 'clear' | 'centerline' | 'unknown';
export type MeasurementOrigin = 'explicit' | 'derived' | 'vector-traced' | 'presentation-default' | 'unresolved';
export type EvidenceConfidence = 'high' | 'medium' | 'low' | 'unresolved';
export type VerificationStatus = 'pending' | 'passed';
export type GeometryModelStatus = 'unresolved' | 'partially-modeled' | 'modeled' | 'verified';

/** Audit metadata for a dimensional value. Presentation defaults must never be treated as source measurements. */
export interface MeasurementEvidence {
  origin: MeasurementOrigin;
  basis: MeasurementBasis;
  confidence: EvidenceConfidence;
  sourceFileId?: EntityId;
  sourcePage?: number;
  annotation?: string;
  derivation?: string;
}

/** Link from modeled geometry back to the exact supplied drawing. */
export interface GeometryTrace {
  sourceFileId: EntityId;
  sourcePage: number;
  confidence: EvidenceConfidence;
  sourceRect?: SourcePdfRect;
  unresolved?: string[];
}

export interface SourceDocument {
  id: EntityId;
  driveFileId: EntityId;
  fileName: string;
  sourcePath: string;
  sourceUrl: string;
  mimeType: 'application/pdf';
  sizeBytes: number;
}

export interface SourceSheet {
  id: EntityId;
  documentId: EntityId;
  pageNumber: number;
  sheetLabel: string;
  pageWidthPoints?: number;
  pageHeightPoints?: number;
  planBoundsPoints?: SourcePdfRect;
}

interface OpeningBase {
  id: EntityId;
  offset: number;
  width: number;
  height?: number;
  measurements?: {
    offset?: MeasurementEvidence;
    width?: MeasurementEvidence;
    height?: MeasurementEvidence;
    sillHeight?: MeasurementEvidence;
  };
  trace?: GeometryTrace;
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
  trace?: GeometryTrace;
  dimensions?: RoomDimension[];
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
  measurements?: {
    length?: MeasurementEvidence;
    thickness?: MeasurementEvidence;
    height?: MeasurementEvidence;
  };
  trace?: GeometryTrace;
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
  trace?: GeometryTrace;
}

export interface Room {
  id: EntityId;
  name: string;
  polygon: Point[];
  wallIds: EntityId[];
  trace?: GeometryTrace;
  /** Printed clear dimensions. Omitted axes must not be inferred from the polygon bounding box. */
  dimensions?: RoomDimension[];
  /** Present only when the source drawing explicitly states a vertical room height. */
  ceilingHeight?: number;
  ceilingHeightEvidence?: MeasurementEvidence;
}

export type RoomDimensionAxis = 'horizontal' | 'vertical' | 'segment';

export interface RoomDimension {
  id: EntityId;
  label: string;
  value: number;
  axis: RoomDimensionAxis;
  evidence: MeasurementEvidence;
}

export type ArchitecturalFixtureKind = 'bathtub' | 'shower' | 'toilet' | 'vanity' | 'sink' | 'washer' | 'dryer';

/** A source-plan fixture. It is fixed architecture and is never treated as draggable furniture. */
export interface ArchitecturalFixture {
  id: EntityId;
  roomId: EntityId;
  kind: ArchitecturalFixtureKind;
  label: string;
  polygon: Point[];
  trace: GeometryTrace;
  measurements?: {
    position?: MeasurementEvidence;
    extent?: MeasurementEvidence;
  };
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
export type FurnitureMaterial = 'wood' | 'fabric' | 'metal' | 'glass' | 'ceramic' | 'painted';
export type FurnitureStyle = 'minimal' | 'classic' | 'soft' | 'architectural';

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
  material?: FurnitureMaterial;
  style?: FurnitureStyle;
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
  /** Apartment number printed in the architectural title block; distinct from the sheet identifier. */
  sourceApartmentNumber?: string;
  sourceBuildingType?: string;
  sourceRoomCount?: number;
  sourceAreaSqm?: number;
  sourceCoveredBalconyAreaSqm?: number;
  sourceSukkahBalconyAreaSqm?: number;
  sourceScale?: string;
  sourceEdition?: number;
  sourceDate?: string;
  modelingMethod?: 'automatic' | 'semi-automatic' | 'manually-normalized';
  modelingNotes?: string;
  documentId?: EntityId;
  sheetId?: EntityId;
  measurementBasis?: MeasurementBasis;
  geometryStatus?: GeometryModelStatus;
  mathematicalVerification?: VerificationStatus;
  visualVerification?: VerificationStatus;
  unresolvedFields?: string[];
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
  fixtures?: ArchitecturalFixture[];
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

export interface FurnitureOverride {
  id: EntityId;
  x: number;
  y: number;
  rotation: number;
  width?: number;
  depth?: number;
  height?: number;
  elevation?: number;
  color?: string;
  accentColor?: string;
  material?: FurnitureMaterial;
  style?: FurnitureStyle;
}

export type SceneObjectCategory =
  'cabinetry' | 'beds' | 'kitchen' | 'bathroom' | 'living' | 'work' | 'utility' | 'decor';

export interface DesignVisibility {
  hiddenObjectIds: EntityId[];
  hiddenCategories: SceneObjectCategory[];
}

export interface RoomCameraOrbit {
  yaw: number;
  pitch: number;
  zoom: number;
}

export interface SavedDesignV1 {
  schemaVersion: 1;
  id: EntityId;
  apartmentId: EntityId;
  name: string;
  updatedAt: string;
  placements: CabinetPlacement[];
  metadata?: SavedDesignMetadata;
}

export interface SavedDesignV2 {
  schemaVersion: 2;
  id: EntityId;
  apartmentId: EntityId;
  name: string;
  updatedAt: string;
  placements: CabinetPlacement[];
  /** Furniture created by the customer in addition to the source apartment catalogue. */
  addedFurniture?: FurniturePlacement[];
  furnitureOverrides: FurnitureOverride[];
  visibility: DesignVisibility;
  furniturePalette: FurniturePalette;
  cameraByRoom: Record<EntityId, RoomCameraOrbit>;
  metadata?: SavedDesignMetadata;
}

export interface SavedDesignV3 {
  schemaVersion: 3;
  id: EntityId;
  apartmentId: EntityId;
  name: string;
  updatedAt: string;
  placements: CabinetPlacement[];
  /** Furniture created by the customer in addition to the source apartment catalogue. */
  addedFurniture?: FurniturePlacement[];
  furnitureOverrides: FurnitureOverride[];
  visibility: DesignVisibility;
  furniturePalette: FurniturePalette;
  cameraByRoom: Record<EntityId, RoomCameraOrbit>;
  metadata?: SavedDesignMetadata;
}

export type SavedDesign = SavedDesignV1 | SavedDesignV2 | SavedDesignV3;
