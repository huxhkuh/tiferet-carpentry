import type {
  Apartment,
  ArchitecturalFixture,
  ArchitecturalFixtureKind,
  EvidenceConfidence,
  GeometryTrace,
  MeasurementEvidence,
  MeasurementOrigin,
  Point,
  Project,
  RoomDimension,
  RoomDimensionAxis,
  Wall,
} from '../types';
import { createFurniturePlacement } from '../furniture/catalog';
import {
  sourcePlanPoint,
  sourcePlanRect,
  TIFERET_5_1_WALL_MASSES,
  TIFERET_SOURCE_PLAN_BOUNDS,
} from './tiferet-source-plan';

const SOURCE_FILE_ID = '1RTrFsQ1eBTVzudl3wC0Ocv5DirPh6tBq';
const SOURCE_PAGE = 1;

function sourceTrace(confidence: EvidenceConfidence = 'medium'): GeometryTrace {
  return { sourceFileId: SOURCE_FILE_ID, sourcePage: SOURCE_PAGE, confidence };
}

function measurement(
  origin: MeasurementOrigin,
  confidence: EvidenceConfidence,
  annotation?: string,
  basis: MeasurementEvidence['basis'] = origin === 'presentation-default' ? 'unknown' : 'construction',
): MeasurementEvidence {
  return {
    origin,
    basis,
    confidence,
    sourceFileId: SOURCE_FILE_ID,
    sourcePage: SOURCE_PAGE,
    ...(annotation === undefined ? {} : { annotation }),
  };
}

function sourceHorizontalThickness(x0: number, x1: number): number {
  return Math.abs(
    sourcePlanPoint(x1, TIFERET_SOURCE_PLAN_BOUNDS.top).x - sourcePlanPoint(x0, TIFERET_SOURCE_PLAN_BOUNDS.top).x,
  );
}

function sourceVerticalThickness(top: number, bottom: number): number {
  return Math.abs(
    sourcePlanPoint(TIFERET_SOURCE_PLAN_BOUNDS.x0, bottom).y - sourcePlanPoint(TIFERET_SOURCE_PLAN_BOUNDS.x0, top).y,
  );
}

function explicitRoomDimension(id: string, label: string, value: number, axis: RoomDimensionAxis): RoomDimension {
  return {
    id,
    label,
    value,
    axis,
    evidence: measurement('explicit', 'high', 'Printed dimension string on official sales plan', 'clear'),
  };
}

function roomDimensions(id: string, horizontal: number, vertical: number): RoomDimension[] {
  return [
    explicitRoomDimension(`${id}-horizontal`, 'רוחב נקי', horizontal, 'horizontal'),
    explicitRoomDimension(`${id}-vertical`, 'עומק נקי', vertical, 'vertical'),
  ];
}

function fixture(
  id: string,
  roomId: string,
  kind: ArchitecturalFixtureKind,
  label: string,
  x0: number,
  top: number,
  x1: number,
  bottom: number,
  confidence: EvidenceConfidence = 'medium',
): ArchitecturalFixture {
  return {
    id,
    roomId,
    kind,
    label,
    polygon: sourcePlanRect(x0, top, x1, bottom),
    trace: { ...sourceTrace(confidence), sourceRect: { x0, x1, top, bottom } },
    measurements: {
      position: measurement('vector-traced', confidence, 'Position traced from PDF line geometry'),
      extent: measurement('vector-traced', confidence, 'Fixture outline extent; no printed fixture size'),
    },
  };
}

function horizontalOpening(
  id: string,
  kind: Wall['openings'][number]['kind'],
  wallStartX: number,
  sourceY: number,
  sourceX0: number,
  sourceX1: number,
  swing?: 'left' | 'right' | 'sliding',
): Wall['openings'][number] {
  const wallStart = sourcePlanPoint(wallStartX, sourceY).x;
  const first = sourcePlanPoint(sourceX0, sourceY).x;
  const second = sourcePlanPoint(sourceX1, sourceY).x;
  const opening = {
    id,
    kind,
    offset: Math.min(Math.abs(first - wallStart), Math.abs(second - wallStart)),
    width: Math.abs(second - first),
    trace: {
      ...sourceTrace('low'),
      sourceRect: {
        x0: Math.min(sourceX0, sourceX1),
        x1: Math.max(sourceX0, sourceX1),
        top: sourceY - 0.01,
        bottom: sourceY + 0.01,
      },
    },
    measurements: {
      offset: measurement('vector-traced', 'low', 'Opening position traced from PDF line geometry'),
      width: measurement('vector-traced', 'low', 'Opening span traced from PDF line geometry'),
    },
  };
  return kind === 'door' ? { ...opening, kind, ...(swing === undefined ? {} : { swing }) } : { ...opening, kind };
}

function verticalOpening(
  id: string,
  kind: Wall['openings'][number]['kind'],
  sourceX: number,
  wallStartY: number,
  sourceY0: number,
  sourceY1: number,
  swing?: 'left' | 'right' | 'sliding',
): Wall['openings'][number] {
  const wallStart = sourcePlanPoint(sourceX, wallStartY).y;
  const first = sourcePlanPoint(sourceX, sourceY0).y;
  const second = sourcePlanPoint(sourceX, sourceY1).y;
  const opening = {
    id,
    kind,
    offset: Math.min(Math.abs(first - wallStart), Math.abs(second - wallStart)),
    width: Math.abs(second - first),
    trace: {
      ...sourceTrace('low'),
      sourceRect: {
        x0: sourceX - 0.01,
        x1: sourceX + 0.01,
        top: Math.min(sourceY0, sourceY1),
        bottom: Math.max(sourceY0, sourceY1),
      },
    },
    measurements: {
      offset: measurement('vector-traced', 'low', 'Opening position traced from PDF line geometry'),
      width: measurement('vector-traced', 'low', 'Opening span traced from PDF line geometry'),
    },
  };
  return kind === 'door' ? { ...opening, kind, ...(swing === undefined ? {} : { swing }) } : { ...opening, kind };
}

function derivedOpening(
  id: string,
  kind: Wall['openings'][number]['kind'],
  offset: number,
  width: number,
  swing?: 'left' | 'right' | 'sliding',
): Wall['openings'][number] {
  const opening = {
    id,
    kind,
    offset,
    width,
    measurements: {
      offset: measurement(
        'derived',
        'low',
        'Estimated from the normalized plan; exact source span is not isolated',
        'unknown',
      ),
      width: measurement('derived', 'low', 'Estimated from the normalized plan; no printed opening width', 'unknown'),
    },
  };
  return kind === 'door' ? { ...opening, kind, ...(swing === undefined ? {} : { swing }) } : { ...opening, kind };
}

function wall(id: string, start: Point, end: Point, openings: Wall['openings'] = [], thickness = 100): Wall {
  return {
    id,
    start,
    end,
    openings: openings.map((opening) => ({
      ...opening,
      measurements: opening.measurements ?? {
        offset: measurement('derived', 'low', 'Opening offset inferred from the drawing', 'unknown'),
        width: measurement('derived', 'low', 'Opening width inferred from the drawing', 'unknown'),
      },
    })),
    thickness,
    measurements: {
      length: measurement('derived', 'medium', 'Derived from the calibrated source-plan coordinate frame'),
      thickness: measurement('vector-traced', 'medium'),
    },
    trace: sourceTrace(),
  };
}

/**
 * Apartment 5-1, normalized to millimetres from the official one-page vector
 * sales plan. The clear room dimensions come from the printed dimension
 * strings; wall positions, joins, openings and the stepped outline were traced
 * against the PDF vector rectangles. It is a planning model, not a site survey.
 */
export const TIFERET_5_1: Apartment = {
  id: 'tiferet-techelet-5-1',
  name: 'דירה 5-1',
  type: 'טיפוס שני',
  apartmentTypeId: 'type-two',
  source: {
    project: 'Tiferet',
    building: 'Techelet',
    floor: 5,
    sheet: '5-1',
    sourceType: 'sales-plan-pdf',
    sourceFile: 'טיפוס שני - Sheet - 5-1 - פרויקט תפארת - רמלה.pdf',
    sourceUrl: 'https://drive.google.com/drive/folders/1K3jMHkgnPNTydsJYdTVOzqkEinDPmwG4',
    sourceFileId: SOURCE_FILE_ID,
    sourceSha256: '2165ED6217A04A5A56AC00B5B3DBF0AC477F6224884CFD1A513FCF6B478F6DBE',
    sourcePage: 1,
    pageWidthPoints: 2_268,
    pageHeightPoints: 1_193,
    sourcePlanBoundsPoints: TIFERET_SOURCE_PLAN_BOUNDS,
    sourceApartmentNumber: '23-א',
    sourceBuildingType: 'תכלת א',
    sourceRoomCount: 4,
    sourceAreaSqm: 97.4,
    sourceCoveredBalconyAreaSqm: 17.8,
    sourceSukkahBalconyAreaSqm: 3.3,
    sourceScale: '1 : 50',
    sourceEdition: 1,
    sourceDate: '17.03.26',
    modelingMethod: 'semi-automatic',
    measurementBasis: 'construction',
    geometryStatus: 'partially-modeled',
    mathematicalVerification: 'pending',
    visualVerification: 'pending',
    unresolvedFields: [
      'wall-heights',
      'door-heights',
      'window-heights',
      'window-sill-heights',
      'ceiling-heights',
      'opening-offset-source-audit',
      'complete-dimension-chain-closure',
    ],
    modelingNotes:
      'Forty-eight filled structural wall rectangles and their joins were extracted from the official vector PDF. Piecewise calibration anchors preserve the printed clear-room dimensions in millimetres. This is not an as-built survey.',
  },
  walls: [
    wall(
      'safe-n',
      sourcePlanPoint(627.96, 402.12),
      sourcePlanPoint(798.12, 402.12),
      [],
      sourceVerticalThickness(378.84, 402.12),
    ),
    wall(
      'safe-e',
      sourcePlanPoint(798.12, 402.12),
      sourcePlanPoint(798.12, 577.92),
      [],
      sourceHorizontalThickness(798.12, 815.04),
    ),
    wall(
      'safe-s',
      sourcePlanPoint(798.12, 577.92),
      sourcePlanPoint(627.96, 577.92),
      [derivedOpening('safe-door', 'door', 250, 800, 'right')],
      sourceVerticalThickness(577.92, 592.08),
    ),
    wall(
      'safe-w',
      sourcePlanPoint(627.96, 577.92),
      sourcePlanPoint(627.96, 402.12),
      [derivedOpening('safe-window', 'window', 985, 982)],
      sourceHorizontalThickness(610.92, 627.96),
    ),
    wall(
      'bed-n',
      sourcePlanPoint(815.04, 395.88),
      sourcePlanPoint(970.92, 395.88),
      [horizontalOpening('bed-window', 'window', 815.04, 395.88, 861, 929.04)],
      sourceVerticalThickness(378.84, 395.88),
    ),
    wall(
      'bed-e',
      sourcePlanPoint(970.92, 395.88),
      sourcePlanPoint(970.92, 568.8),
      [],
      sourceHorizontalThickness(970.92, 976.68),
    ),
    wall(
      'bed-s',
      sourcePlanPoint(970.92, 568.8),
      sourcePlanPoint(815.04, 568.8),
      [derivedOpening('bed-door', 'door', 1_848, 807, 'left')],
      sourceVerticalThickness(568.8, 574.44),
    ),
    wall(
      'bed-w',
      sourcePlanPoint(815.04, 568.8),
      sourcePlanPoint(815.04, 395.88),
      [],
      sourceHorizontalThickness(798.12, 815.04),
    ),
    wall(
      'living-n',
      sourcePlanPoint(976.68, 395.88),
      sourcePlanPoint(1_175.04, 395.88),
      [horizontalOpening('living-balcony-door', 'door', 976.68, 395.88, 1_014.12, 1_150.08, 'sliding')],
      sourceVerticalThickness(378.84, 395.88),
    ),
    wall(
      'living-e',
      sourcePlanPoint(1_175.04, 395.88),
      sourcePlanPoint(1_175.04, 883.44),
      [verticalOpening('main-entry', 'door', 1_175.04, 395.88, 806.88, 877.8, 'right')],
      sourceHorizontalThickness(1_175.04, 1_192.08),
    ),
    wall(
      'living-s',
      sourcePlanPoint(1_175.04, 883.44),
      sourcePlanPoint(1_082.64, 883.44),
      [],
      sourceVerticalThickness(877.8, 883.44),
    ),
    wall(
      'living-entry-return',
      sourcePlanPoint(1_082.64, 883.44),
      sourcePlanPoint(1_082.64, 877.8),
      [],
      sourceHorizontalThickness(1_075.32, 1_082.64),
    ),
    wall(
      'living-w-upper',
      sourcePlanPoint(976.68, 568.8),
      sourcePlanPoint(976.68, 395.88),
      [],
      sourceHorizontalThickness(970.92, 976.68),
    ),
    wall(
      'shower-n',
      sourcePlanPoint(629.64, 592.08),
      sourcePlanPoint(724.32, 592.08),
      [],
      sourceVerticalThickness(580.68, 592.08),
    ),
    wall(
      'shower-e',
      sourcePlanPoint(724.32, 592.08),
      sourcePlanPoint(724.32, 686.76),
      [],
      sourceHorizontalThickness(724.32, 735.72),
    ),
    wall(
      'shower-s',
      sourcePlanPoint(724.32, 686.76),
      sourcePlanPoint(629.64, 686.76),
      [horizontalOpening('shower-door', 'door', 724.32, 686.76, 673.68, 719.04, 'left')],
      sourceVerticalThickness(686.76, 694.08),
    ),
    wall(
      'shower-w',
      sourcePlanPoint(629.64, 686.76),
      sourcePlanPoint(629.64, 592.08),
      [derivedOpening('shower-window', 'window', 390, 720)],
      sourceHorizontalThickness(610.92, 629.64),
    ),
    wall(
      'guest-wc-n',
      sourcePlanPoint(899.52, 574.44),
      sourcePlanPoint(987.96, 574.44),
      [],
      sourceVerticalThickness(568.8, 574.44),
    ),
    wall(
      'guest-wc-e',
      sourcePlanPoint(987.96, 574.44),
      sourcePlanPoint(987.96, 628.92),
      [],
      sourceHorizontalThickness(987.96, 993.6),
    ),
    wall(
      'guest-wc-s',
      sourcePlanPoint(987.96, 628.92),
      sourcePlanPoint(899.52, 628.92),
      [horizontalOpening('guest-wc-door', 'door', 987.96, 628.92, 943.8, 983.4, 'left')],
      sourceVerticalThickness(628.92, 634.56),
    ),
    wall(
      'guest-wc-w',
      sourcePlanPoint(899.52, 628.92),
      sourcePlanPoint(899.52, 574.44),
      [],
      sourceHorizontalThickness(893.88, 899.52),
    ),
    wall(
      'master-n',
      sourcePlanPoint(627.96, 694.08),
      sourcePlanPoint(849.12, 694.08),
      [derivedOpening('master-door', 'door', 2_322, 782, 'right')],
      sourceVerticalThickness(688.44, 694.08),
    ),
    wall(
      'master-e',
      sourcePlanPoint(849.12, 694.08),
      sourcePlanPoint(849.12, 863.64),
      [],
      sourceHorizontalThickness(849.12, 854.76),
    ),
    wall(
      'master-s',
      sourcePlanPoint(849.12, 863.64),
      sourcePlanPoint(627.96, 863.64),
      [],
      sourceVerticalThickness(863.64, 880.68),
    ),
    wall(
      'master-w',
      sourcePlanPoint(627.96, 863.64),
      sourcePlanPoint(627.96, 694.08),
      [derivedOpening('master-window', 'window', 944, 1_181)],
      sourceHorizontalThickness(610.92, 627.96),
    ),
    wall(
      'bath-n',
      sourcePlanPoint(856.44, 695.76),
      sourcePlanPoint(987.96, 695.76),
      [derivedOpening('bath-door', 'door', 770, 733, 'right')],
      sourceVerticalThickness(688.44, 695.76),
    ),
    wall(
      'bath-e',
      sourcePlanPoint(987.96, 695.76),
      sourcePlanPoint(987.96, 793.92),
      [],
      sourceHorizontalThickness(987.96, 993.6),
    ),
    wall(
      'bath-s',
      sourcePlanPoint(987.96, 793.92),
      sourcePlanPoint(856.44, 793.92),
      [],
      sourceVerticalThickness(793.92, 799.56),
    ),
    wall(
      'bath-w',
      sourcePlanPoint(856.44, 793.92),
      sourcePlanPoint(856.44, 695.76),
      [],
      sourceHorizontalThickness(849.12, 856.44),
    ),
    wall(
      'laundry-n',
      sourcePlanPoint(787.32, 880.68),
      sourcePlanPoint(936.96, 880.68),
      [],
      sourceVerticalThickness(869.28, 880.68),
    ),
    wall(
      'laundry-e',
      sourcePlanPoint(936.96, 880.68),
      sourcePlanPoint(936.96, 979.8),
      [verticalOpening('laundry-window', 'window', 936.96, 880.68, 907.32, 975.36)],
      sourceHorizontalThickness(936.96, 954),
    ),
    wall(
      'laundry-s',
      sourcePlanPoint(936.96, 979.8),
      sourcePlanPoint(787.32, 979.8),
      [],
      sourceVerticalThickness(979.8, 991.2),
    ),
    wall(
      'laundry-w',
      sourcePlanPoint(787.32, 979.8),
      sourcePlanPoint(787.32, 880.68),
      [],
      sourceHorizontalThickness(782.64, 787.32),
    ),
    wall(
      'kitchen-n',
      sourcePlanPoint(1_082.64, 883.44),
      sourcePlanPoint(1_175.04, 883.44),
      [],
      sourceVerticalThickness(877.8, 883.44),
    ),
    wall(
      'kitchen-e',
      sourcePlanPoint(1_175.04, 883.44),
      sourcePlanPoint(1_175.04, 979.8),
      [],
      sourceHorizontalThickness(1_175.04, 1_192.08),
    ),
    wall(
      'kitchen-s',
      sourcePlanPoint(1_175.04, 979.8),
      sourcePlanPoint(954, 979.8),
      [],
      sourceVerticalThickness(979.8, 991.2),
    ),
    wall(
      'kitchen-w',
      sourcePlanPoint(954, 979.8),
      sourcePlanPoint(954, 883.44),
      [verticalOpening('kitchen-window', 'window', 954, 979.8, 907.32, 975.36)],
      sourceHorizontalThickness(945.48, 954),
    ),
  ],
  wallMasses: TIFERET_5_1_WALL_MASSES.map((mass) => ({
    ...mass,
    trace: { ...sourceTrace('medium'), sourceRect: mass.sourcePdfRect },
  })),
  rooms: [
    {
      id: 'safe-room',
      name: 'ממ״ד',
      polygon: sourcePlanRect(627.96, 402.12, 798.12, 577.92),
      wallIds: ['safe-n', 'safe-e', 'safe-s', 'safe-w'],
      dimensions: roomDimensions('safe-room', 2_950, 3_050),
      trace: sourceTrace('high'),
    },
    {
      id: 'bedroom',
      name: 'חדר שינה',
      polygon: sourcePlanRect(815.04, 395.88, 970.92, 568.8),
      wallIds: ['bed-n', 'bed-e', 'bed-s', 'bed-w'],
      dimensions: roomDimensions('bedroom', 2_700, 3_000),
      trace: sourceTrace('high'),
    },
    {
      id: 'living',
      name: 'סלון',
      polygon: [
        sourcePlanPoint(976.68, 395.88),
        sourcePlanPoint(1_175.04, 395.88),
        sourcePlanPoint(1_175.04, 883.44),
        sourcePlanPoint(993.6, 883.44),
        sourcePlanPoint(993.6, 568.8),
        sourcePlanPoint(976.68, 568.8),
      ],
      wallIds: ['living-n', 'living-e', 'living-s', 'living-entry-return', 'living-w-upper'],
      dimensions: roomDimensions('living', 3_450, 8_450),
      trace: sourceTrace('high'),
    },
    {
      id: 'shower',
      name: 'חדר רחצה',
      polygon: sourcePlanRect(629.64, 592.08, 724.32, 686.76),
      wallIds: ['shower-n', 'shower-e', 'shower-s', 'shower-w'],
      dimensions: roomDimensions('shower', 1_650, 1_600),
      trace: sourceTrace('high'),
    },
    {
      id: 'guest-wc',
      name: 'שירותי אורחים',
      polygon: sourcePlanRect(899.52, 574.44, 987.96, 628.92),
      wallIds: ['guest-wc-n', 'guest-wc-e', 'guest-wc-s', 'guest-wc-w'],
      dimensions: roomDimensions('guest-wc', 1_500, 900),
      trace: sourceTrace('high'),
    },
    {
      id: 'master',
      name: 'חדר שינה הורים',
      polygon: sourcePlanRect(627.96, 694.08, 849.12, 863.64),
      wallIds: ['master-n', 'master-e', 'master-s', 'master-w'],
      dimensions: roomDimensions('master', 3_850, 2_950),
      trace: sourceTrace('high'),
    },
    {
      id: 'bath',
      name: 'אמבטיה',
      polygon: sourcePlanRect(856.44, 695.76, 987.96, 793.92),
      wallIds: ['bath-n', 'bath-e', 'bath-s', 'bath-w'],
      dimensions: roomDimensions('bath', 2_290, 1_700),
      trace: sourceTrace('high'),
    },
    {
      id: 'laundry',
      name: 'מסתור כביסה',
      polygon: sourcePlanRect(787.32, 880.68, 936.96, 979.8),
      wallIds: ['laundry-n', 'laundry-e', 'laundry-s', 'laundry-w'],
      dimensions: [explicitRoomDimension('laundry-vertical', 'עומק נקי', 1_700, 'vertical')],
      trace: sourceTrace('medium'),
    },
    {
      id: 'kitchen',
      name: 'מטבח',
      polygon: sourcePlanRect(954, 883.44, 1_175.04, 979.8),
      wallIds: ['kitchen-n', 'kitchen-e', 'kitchen-s', 'kitchen-w'],
      dimensions: roomDimensions('kitchen', 3_850, 1_700),
      trace: sourceTrace('high'),
    },
  ],
  fixtures: [
    fixture('shower-tray', 'shower', 'shower', 'מקלחון', 632.52, 596.88, 686.52, 644.4, 'high'),
    fixture('shower-vanity', 'shower', 'vanity', 'כיור רחצה', 686.52, 596.88, 722.4, 644.4, 'medium'),
    fixture('shower-toilet', 'shower', 'toilet', 'אסלה', 632.52, 647.28, 686.52, 684, 'medium'),
    fixture('guest-wc-vanity', 'guest-wc', 'vanity', 'כיור אורחים', 899.52, 575.88, 918.24, 627.48, 'medium'),
    fixture('guest-wc-toilet', 'guest-wc', 'toilet', 'אסלה', 918.24, 581.64, 962.4, 623.16, 'medium'),
    fixture('bath-vanity', 'bath', 'vanity', 'כיור אמבטיה', 856.44, 695.76, 898.44, 751.32, 'medium'),
    fixture('bath-toilet', 'bath', 'toilet', 'אסלה', 856.44, 751.32, 899.52, 793.92, 'medium'),
    fixture('bath-bathtub', 'bath', 'bathtub', 'אמבט', 946.56, 695.76, 986.28, 791.64, 'high'),
  ],
  furniture: [
    createFurniturePlacement('safe-room-guest-bed', 'safe-room', 'single-bed', 1_000, 1_450, {
      rotation: Math.PI / 2,
    }),
    createFurniturePlacement('safe-room-desk', 'safe-room', 'desk', 2_480, 700, {
      rotation: Math.PI / 2,
    }),
    createFurniturePlacement('safe-room-bookshelf', 'safe-room', 'bookshelf', 2_720, 2_250, {
      rotation: Math.PI / 2,
    }),
    createFurniturePlacement('bedroom-bed-a', 'bedroom', 'single-bed', 3_700, 1_120, { width: 800 }),
    createFurniturePlacement('bedroom-bed-b', 'bedroom', 'single-bed', 4_600, 1_120, { width: 800 }),
    createFurniturePlacement('bedroom-nightstand', 'bedroom', 'nightstand', 4_550, 2_400),
    createFurniturePlacement('bedroom-desk', 'bedroom', 'desk', 5_580, 2_500, {
      width: 720,
      rotation: Math.PI / 2,
    }),
    createFurniturePlacement('living-rug', 'living', 'rug', 7_850, 2_600),
    createFurniturePlacement('living-sofa', 'living', 'sofa', 7_850, 1_500),
    createFurniturePlacement('living-coffee-table', 'living', 'coffee-table', 7_850, 2_850),
    createFurniturePlacement('living-media-console', 'living', 'media-console', 9_300, 2_800, {
      rotation: Math.PI / 2,
    }),
    createFurniturePlacement('living-dining-table', 'living', 'dining-table', 7_750, 5_850, {
      rotation: Math.PI / 2,
    }),
    createFurniturePlacement('living-chair-a', 'living', 'dining-chair', 6_950, 5_850, {
      rotation: Math.PI / 2,
    }),
    createFurniturePlacement('living-chair-b', 'living', 'dining-chair', 8_550, 5_850, {
      rotation: -Math.PI / 2,
    }),
    createFurniturePlacement('living-chair-c', 'living', 'dining-chair', 7_750, 4_700, {
      rotation: Math.PI,
    }),
    createFurniturePlacement('living-chair-d', 'living', 'dining-chair', 7_750, 7_000, {
      rotation: 0,
    }),
    createFurniturePlacement('living-plant', 'living', 'plant', 9_050, 700),
    createFurniturePlacement('scene-shower-tray', 'shower', 'shower', 550, 3_840),
    createFurniturePlacement('scene-shower-vanity', 'shower', 'vanity', 1_350, 3_840, {
      width: 650,
      rotation: Math.PI / 2,
    }),
    createFurniturePlacement('scene-shower-toilet', 'shower', 'toilet', 550, 4_650, {
      rotation: Math.PI / 2,
    }),
    createFurniturePlacement('scene-guest-wc-toilet', 'guest-wc', 'toilet', 5_300, 3_560, {
      depth: 560,
      rotation: Math.PI / 2,
    }),
    createFurniturePlacement('scene-guest-wc-vanity', 'guest-wc', 'vanity', 6_000, 3_550, {
      width: 520,
      depth: 360,
    }),
    createFurniturePlacement('master-double-bed', 'master', 'double-bed', 1_900, 6_150),
    createFurniturePlacement('master-nightstand-a', 'master', 'nightstand', 720, 5_350),
    createFurniturePlacement('master-nightstand-b', 'master', 'nightstand', 3_080, 5_350),
    createFurniturePlacement('master-desk', 'master', 'desk', 3_450, 7_100, {
      width: 950,
      rotation: Math.PI / 2,
    }),
    createFurniturePlacement('scene-bath-bathtub', 'bath', 'bathtub', 5_880, 5_970, {
      rotation: Math.PI / 2,
    }),
    createFurniturePlacement('scene-bath-vanity', 'bath', 'vanity', 4_420, 5_540),
    createFurniturePlacement('scene-bath-toilet', 'bath', 'toilet', 4_350, 6_350, {
      rotation: Math.PI / 2,
    }),
    createFurniturePlacement('laundry-washer', 'laundry', 'washer', 3_180, 9_150),
    createFurniturePlacement('laundry-dryer', 'laundry', 'dryer', 3_850, 9_150),
    createFurniturePlacement('kitchen-base-run', 'kitchen', 'kitchen-base-run', 6_950, 9_420),
    createFurniturePlacement('kitchen-wall-run', 'kitchen', 'kitchen-wall-run', 6_950, 9_560),
    createFurniturePlacement('kitchen-sink', 'kitchen', 'sink', 6_750, 9_250),
    createFurniturePlacement('kitchen-oven', 'kitchen', 'oven', 8_350, 9_420),
    createFurniturePlacement('kitchen-fridge', 'kitchen', 'refrigerator', 9_120, 9_400),
  ],
  fixedElements: [
    {
      id: 'bath-service-shaft',
      roomId: 'bath',
      kind: 'shaft',
      label: 'פיר שירות',
      polygon: sourcePlanRect(856.44, 799.56, 946.56, 861.96),
      trace: {
        ...sourceTrace('high'),
        sourceRect: { x0: 856.44, x1: 946.56, top: 799.56, bottom: 861.96 },
      },
      dimensions: roomDimensions('bath-service-shaft', 1_550, 1_050),
    },
    {
      id: 'sales-plan-balcony',
      roomId: 'living',
      kind: 'balcony-void',
      label: 'מרפסת',
      polygon: sourcePlanRect(806.52, 220.2, 1_180.8, 378.84),
      trace: {
        ...sourceTrace('high'),
        sourceRect: { x0: 806.52, x1: 1_180.8, top: 220.2, bottom: 378.84 },
      },
      dimensions: [
        ...roomDimensions('sales-plan-balcony', 5_650, 2_750),
        explicitRoomDimension('sales-plan-sukkah-segment', 'מקטע סוכה', 850, 'segment'),
      ],
    },
    {
      id: 'sales-plan-kitchen-counter',
      roomId: 'kitchen',
      kind: 'plumbing',
      label: 'מטבח קבוע בתכנית המכר',
      polygon: [
        { x: 6_000, y: 9_150 },
        { x: 9_100, y: 9_150 },
        { x: 9_100, y: 8_350 },
        { x: 9_450, y: 8_350 },
        { x: 9_450, y: 9_500 },
        { x: 6_000, y: 9_500 },
      ],
    },
    {
      id: 'laundry-machine-zone',
      roomId: 'laundry',
      kind: 'laundry',
      label: 'מכונת כביסה',
      polygon: [
        { x: 2_850, y: 8_850 },
        { x: 3_500, y: 8_850 },
        { x: 3_500, y: 9_500 },
        { x: 2_850, y: 9_500 },
      ],
    },
  ],
};

export const TIFERET_PROJECT: Project = {
  id: 'tiferet',
  name: 'פרויקט תפארת',
  apartmentTypes: [{ id: 'type-two', name: 'טיפוס שני', description: 'דירת 4 חדרים לפי גיליון 5-1' }],
  buildings: [
    {
      id: 'techelet',
      name: 'תכלת',
      type: 'residential',
      floors: [{ id: 'techelet-floor-5', number: 5, apartments: [TIFERET_5_1] }],
    },
  ],
};
