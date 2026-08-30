import type { Apartment, Point, Room, SourcePdfRect, Wall, WallMass } from '../types';
import type { ImportedApartmentMetadata, ImportRoomDraft, ImportWallDraft, PdfImportDraft } from './types';

function safeId(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return normalized.length > 0 ? normalized : 'plan';
}

function sourcePointToMm(point: Point, draft: PdfImportDraft): Point {
  const scale = draft.calibration?.mmPerSourceUnit;
  if (scale === undefined) throw new TypeError('יש לכייל מידה ידועה לפני יצירת מודל דירה');
  return {
    x: (point.x - draft.planBounds.x0) * scale,
    y: (point.y - draft.planBounds.top) * scale,
  };
}

function rectanglePolygon(rectangle: SourcePdfRect, draft: PdfImportDraft): Point[] {
  return [
    sourcePointToMm({ x: rectangle.x0, y: rectangle.top }, draft),
    sourcePointToMm({ x: rectangle.x1, y: rectangle.top }, draft),
    sourcePointToMm({ x: rectangle.x1, y: rectangle.bottom }, draft),
    sourcePointToMm({ x: rectangle.x0, y: rectangle.bottom }, draft),
  ];
}

function wallFromDraft(wall: ImportWallDraft, draft: PdfImportDraft): Wall {
  const rectangle = wall.sourceRect;
  const midpointX = (rectangle.x0 + rectangle.x1) / 2;
  const midpointY = (rectangle.top + rectangle.bottom) / 2;
  const sourceStart =
    wall.orientation === 'horizontal' ? { x: rectangle.x0, y: midpointY } : { x: midpointX, y: rectangle.top };
  const sourceEnd =
    wall.orientation === 'horizontal' ? { x: rectangle.x1, y: midpointY } : { x: midpointX, y: rectangle.bottom };
  const scale = draft.calibration?.mmPerSourceUnit ?? 0;
  const thicknessSource =
    wall.orientation === 'horizontal' ? rectangle.bottom - rectangle.top : rectangle.x1 - rectangle.x0;
  return {
    id: wall.id,
    start: sourcePointToMm(sourceStart, draft),
    end: sourcePointToMm(sourceEnd, draft),
    openings: [],
    thickness: thicknessSource * scale,
    measurements: {
      length: {
        origin: 'derived',
        basis: 'centerline',
        confidence: 'medium',
        sourceFileId: draft.source.sourceId,
        sourcePage: 1,
        derivation: 'נמדד מגאומטריית הווקטור לאחר כיול המשתמש',
      },
      thickness: {
        origin: 'vector-traced',
        basis: 'construction',
        confidence: 'medium',
        sourceFileId: draft.source.sourceId,
        sourcePage: 1,
      },
    },
    trace: {
      sourceFileId: draft.source.sourceId,
      sourcePage: 1,
      confidence: 'medium',
      sourceRect: { ...rectangle },
      unresolved: ['opening-verification'],
    },
  };
}

function wallLengthInSource(wall: ImportWallDraft): number {
  return wall.orientation === 'horizontal'
    ? wall.sourceRect.x1 - wall.sourceRect.x0
    : wall.sourceRect.bottom - wall.sourceRect.top;
}

function roomBoundaryWallIds(room: ImportRoomDraft, walls: readonly ImportWallDraft[]): string[] {
  const xs = room.sourcePolygon.map((point) => point.x);
  const ys = room.sourcePolygon.map((point) => point.y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  const candidates = walls.flatMap((wall) => {
    const wallWidth = wall.sourceRect.x1 - wall.sourceRect.x0;
    const wallHeight = wall.sourceRect.bottom - wall.sourceRect.top;
    const margin = Math.min(wallWidth, wallHeight) * 2.5;
    if (wall.orientation === 'horizontal') {
      const wallY = (wall.sourceRect.top + wall.sourceRect.bottom) / 2;
      if (wall.sourceRect.x1 < left - margin || wall.sourceRect.x0 > right + margin) return [];
      const topDistance = Math.abs(wallY - top);
      const bottomDistance = Math.abs(wallY - bottom);
      if (Math.min(topDistance, bottomDistance) > margin) return [];
      return [{ wall, side: topDistance <= bottomDistance ? 'top' : 'bottom' }];
    }
    const wallX = (wall.sourceRect.x0 + wall.sourceRect.x1) / 2;
    if (wall.sourceRect.bottom < top - margin || wall.sourceRect.top > bottom + margin) return [];
    const leftDistance = Math.abs(wallX - left);
    const rightDistance = Math.abs(wallX - right);
    if (Math.min(leftDistance, rightDistance) > margin) return [];
    return [{ wall, side: leftDistance <= rightDistance ? 'left' : 'right' }];
  });
  const bySide = new Map<string, ImportWallDraft>();
  for (const candidate of candidates) {
    const current = bySide.get(candidate.side);
    if (current === undefined || wallLengthInSource(candidate.wall) > wallLengthInSource(current)) {
      bySide.set(candidate.side, candidate.wall);
    }
  }
  return [...new Set([...bySide.values()].map((wall) => wall.id))];
}

function roomFromDraft(room: ImportRoomDraft, walls: readonly ImportWallDraft[], draft: PdfImportDraft): Room {
  return {
    id: room.id,
    name: room.name,
    polygon: room.sourcePolygon.map((point) => sourcePointToMm(point, draft)),
    wallIds: roomBoundaryWallIds(room, walls),
    trace: {
      sourceFileId: draft.source.sourceId,
      sourcePage: 1,
      confidence: 'low',
      unresolved: ['room-boundary-verification', 'ceiling-height'],
    },
  };
}

function wallMassFromDraft(wall: ImportWallDraft, draft: PdfImportDraft, index: number): WallMass {
  return {
    id: `import-wall-mass-${index + 1}`,
    polygon: rectanglePolygon(wall.sourceRect, draft),
    sourcePdfRect: { ...wall.sourceRect },
    trace: {
      sourceFileId: draft.source.sourceId,
      sourcePage: 1,
      confidence: 'medium',
      sourceRect: { ...wall.sourceRect },
    },
  };
}

export function buildApartmentFromImport(draft: PdfImportDraft, metadata: ImportedApartmentMetadata): Apartment {
  if (draft.calibration === null) throw new TypeError('יש לכייל מידה ידועה לפני יצירת מודל דירה');
  if (draft.walls.length === 0 || draft.rooms.length === 0) {
    throw new TypeError('לא ניתן ליצור דירה ללא קירות וחללים מזוהים');
  }
  if (!Number.isInteger(metadata.floor)) throw new TypeError('מספר הקומה חייב להיות מספר שלם');
  const apartmentId = `imported-${safeId(draft.source.sourceId)}`;
  const projectName = metadata.projectName?.trim() || 'פרויקט מיובא';
  return {
    id: apartmentId,
    name: metadata.apartmentName.trim(),
    type: 'תוכנית מיובאת',
    apartmentTypeId: `${apartmentId}-type`,
    rooms: draft.rooms.map((room) => roomFromDraft(room, draft.walls, draft)),
    walls: draft.walls.map((wall) => wallFromDraft(wall, draft)),
    wallMasses: draft.walls.map((wall, index) => wallMassFromDraft(wall, draft, index)),
    fixedElements: [],
    fixtures: [],
    furniture: [],
    source: {
      project: projectName,
      building: metadata.buildingName.trim(),
      floor: metadata.floor,
      sheet: metadata.sheet.trim(),
      sourceType: 'sales-plan-pdf',
      sourceFile: draft.source.fileName,
      sourceFileId: draft.source.sourceId,
      sourceSha256: draft.source.sourceSha256,
      sourcePage: 1,
      pageWidthPoints: draft.document.width,
      pageHeightPoints: draft.document.height,
      sourcePlanBoundsPoints: { ...draft.planBounds },
      sourceScale: draft.document.detectedScale ?? undefined,
      modelingMethod: 'semi-automatic',
      modelingNotes: 'מסות הקיר זוהו אוטומטית; קנה המידה כויל ידנית. פתחים וקבועות דורשים אימות.',
      measurementBasis: 'unknown',
      geometryStatus: 'partially-modeled',
      mathematicalVerification: 'pending',
      visualVerification: 'pending',
      unresolvedFields: ['opening-verification', 'fixture-verification', 'ceiling-height'],
    },
  };
}
