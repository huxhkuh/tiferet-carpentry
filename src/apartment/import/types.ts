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

interface ImportCalibration extends ImportCalibrationInput {
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
