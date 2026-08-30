import type { Point, SourcePdfRect } from '../types';

export interface PdfVectorRectangle {
  x0: number;
  top: number;
  x1: number;
  bottom: number;
  fillGray: number | null;
  strokeWidth: number;
  source: 'vector';
}

export interface PdfVectorDocument {
  pageCount: number;
  width: number;
  height: number;
  rectangles: PdfVectorRectangle[];
  detectedScale: string | null;
  warnings: string[];
}

export interface PdfImportSource {
  fileName: string;
  fileSizeBytes: number;
  sourceId: string;
  sourceSha256?: string;
}

export interface ImportCalibrationInput {
  sourceStart: Point;
  sourceEnd: Point;
  lengthMm: number;
}

export interface ImportCalibration extends ImportCalibrationInput {
  mmPerSourceUnit: number;
}

export interface ImportWallDraft {
  id: string;
  sourceRect: SourcePdfRect;
  orientation: 'horizontal' | 'vertical';
}

export interface ImportRoomDraft {
  id: string;
  name: string;
  sourcePolygon: Point[];
}

export interface PdfImportDraft {
  source: PdfImportSource;
  document: PdfVectorDocument;
  planBounds: SourcePdfRect;
  walls: ImportWallDraft[];
  rooms: ImportRoomDraft[];
  calibration: ImportCalibration | null;
  warnings: string[];
}

export interface ImportedApartmentMetadata {
  apartmentName: string;
  buildingName: string;
  floor: number;
  sheet: string;
  projectName?: string;
}

export interface ImportDraftPoint {
  x: number;
  y: number;
}

export interface ImportDraftCalibration {
  sourceStart: ImportDraftPoint;
  sourceEnd: ImportDraftPoint;
  lengthMm: number;
  mmPerSourceUnit: number;
}

export interface ImportDraftWall {
  id: string;
  sourceRect: PdfVectorRectangle;
}

export interface ImportDraftRoom {
  id: string;
  name: string;
  sourcePolygon: ImportDraftPoint[];
  wallIds: string[];
}

export interface ArchitecturalImportDraft {
  schemaVersion: 1;
  sourceId: string;
  fileName: string;
  fileSizeBytes: number;
  pageCount: number;
  pageWidth: number;
  pageHeight: number;
  calibration: ImportDraftCalibration | null;
  walls: ImportDraftWall[];
  rooms: ImportDraftRoom[];
  warnings: string[];
}
