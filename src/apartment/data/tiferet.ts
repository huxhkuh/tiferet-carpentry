import type { Apartment, Point, Project, Wall } from '../types';
import { createFurniturePlacement } from '../furniture/catalog';
import {
  sourcePlanPoint,
  sourcePlanRect,
  TIFERET_5_1_WALL_MASSES,
  TIFERET_SOURCE_PLAN_BOUNDS,
} from './tiferet-source-plan';

const WALL_HEIGHT = 2_750;
const WALL_THICKNESS = 140;

function wall(id: string, start: Point, end: Point, openings: Wall['openings'] = [], thickness = WALL_THICKNESS): Wall {
  return { id, start, end, openings, height: WALL_HEIGHT, thickness };
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
    sourceFileId: '1RTrFsQ1eBTVzudl3wC0Ocv5DirPh6tBq',
    sourceSha256: '2165ED6217A04A5A56AC00B5B3DBF0AC477F6224884CFD1A513FCF6B478F6DBE',
    sourcePage: 1,
    pageWidthPoints: 2_268,
    pageHeightPoints: 1_193,
    sourcePlanBoundsPoints: TIFERET_SOURCE_PLAN_BOUNDS,
    modelingMethod: 'semi-automatic',
    modelingNotes:
      'Forty-eight filled structural wall rectangles and their joins were extracted from the official vector PDF. Piecewise calibration anchors preserve the printed clear-room dimensions in millimetres. This is not an as-built survey.',
  },
  walls: [
    wall('safe-n', sourcePlanPoint(627.96, 402.12), sourcePlanPoint(798.12, 402.12)),
    wall('safe-e', sourcePlanPoint(798.12, 402.12), sourcePlanPoint(798.12, 577.92)),
    wall('safe-s', sourcePlanPoint(798.12, 577.92), sourcePlanPoint(627.96, 577.92), [
      { id: 'safe-door', kind: 'door', offset: 250, width: 800, height: 2_100, swing: 'right' },
    ]),
    wall('safe-w', sourcePlanPoint(627.96, 577.92), sourcePlanPoint(627.96, 402.12), [
      { id: 'safe-window', kind: 'window', offset: 850, width: 1_200, height: 1_200, sillHeight: 900 },
    ]),
    wall('bed-n', sourcePlanPoint(815.04, 395.88), sourcePlanPoint(970.92, 395.88), [
      { id: 'bed-window', kind: 'window', offset: 850, width: 1_000, height: 1_200, sillHeight: 900 },
    ]),
    wall('bed-e', sourcePlanPoint(970.92, 395.88), sourcePlanPoint(970.92, 568.8)),
    wall('bed-s', sourcePlanPoint(970.92, 568.8), sourcePlanPoint(815.04, 568.8), [
      { id: 'bed-door', kind: 'door', offset: 180, width: 800, height: 2_100, swing: 'left' },
    ]),
    wall('bed-w', sourcePlanPoint(815.04, 568.8), sourcePlanPoint(815.04, 395.88)),
    wall('living-n', sourcePlanPoint(976.68, 395.88), sourcePlanPoint(1_175.04, 395.88), [
      { id: 'living-balcony-door', kind: 'door', offset: 420, width: 1_800, height: 2_300, swing: 'sliding' },
    ]),
    wall('living-e', sourcePlanPoint(1_175.04, 395.88), sourcePlanPoint(1_175.04, 883.44), [
      { id: 'main-entry', kind: 'door', offset: 7_250, width: 1_050, height: 2_300, swing: 'right' },
    ]),
    wall('living-s', sourcePlanPoint(1_175.04, 883.44), sourcePlanPoint(1_082.64, 883.44)),
    wall('living-entry-return', sourcePlanPoint(1_082.64, 883.44), sourcePlanPoint(1_082.64, 877.8)),
    wall('living-w-upper', sourcePlanPoint(976.68, 568.8), sourcePlanPoint(976.68, 395.88)),
    wall('shower-n', sourcePlanPoint(629.64, 592.08), sourcePlanPoint(724.32, 592.08)),
    wall('shower-e', sourcePlanPoint(724.32, 592.08), sourcePlanPoint(724.32, 686.76), [
      { id: 'shower-door', kind: 'door', offset: 700, width: 800, height: 2_100, swing: 'left' },
    ]),
    wall('shower-s', sourcePlanPoint(724.32, 686.76), sourcePlanPoint(629.64, 686.76)),
    wall('shower-w', sourcePlanPoint(629.64, 686.76), sourcePlanPoint(629.64, 592.08), [
      { id: 'shower-window', kind: 'window', offset: 450, width: 650, height: 650, sillHeight: 1_450 },
    ]),
    wall('guest-wc-n', sourcePlanPoint(899.52, 574.44), sourcePlanPoint(987.96, 574.44)),
    wall('guest-wc-e', sourcePlanPoint(987.96, 574.44), sourcePlanPoint(987.96, 628.92), [
      { id: 'guest-wc-door', kind: 'door', offset: 80, width: 720, height: 2_100, swing: 'left' },
    ]),
    wall('guest-wc-s', sourcePlanPoint(987.96, 628.92), sourcePlanPoint(899.52, 628.92)),
    wall('guest-wc-w', sourcePlanPoint(899.52, 628.92), sourcePlanPoint(899.52, 574.44)),
    wall('master-n', sourcePlanPoint(627.96, 694.08), sourcePlanPoint(849.12, 694.08), [
      { id: 'master-door', kind: 'door', offset: 2_650, width: 800, height: 2_100, swing: 'right' },
    ]),
    wall('master-e', sourcePlanPoint(849.12, 694.08), sourcePlanPoint(849.12, 863.64)),
    wall('master-s', sourcePlanPoint(849.12, 863.64), sourcePlanPoint(627.96, 863.64)),
    wall('master-w', sourcePlanPoint(627.96, 863.64), sourcePlanPoint(627.96, 694.08), [
      { id: 'master-window', kind: 'window', offset: 850, width: 1_400, height: 1_200, sillHeight: 900 },
    ]),
    wall('bath-n', sourcePlanPoint(856.44, 695.76), sourcePlanPoint(987.96, 695.76), [
      { id: 'bath-door', kind: 'door', offset: 180, width: 720, height: 2_100, swing: 'right' },
    ]),
    wall('bath-e', sourcePlanPoint(987.96, 695.76), sourcePlanPoint(987.96, 793.92)),
    wall('bath-s', sourcePlanPoint(987.96, 793.92), sourcePlanPoint(856.44, 793.92)),
    wall('bath-w', sourcePlanPoint(856.44, 793.92), sourcePlanPoint(856.44, 695.76)),
    wall('laundry-n', sourcePlanPoint(787.32, 880.68), sourcePlanPoint(936.96, 880.68), [
      { id: 'laundry-door', kind: 'door', offset: 1_700, width: 850, height: 2_200, swing: 'sliding' },
    ]),
    wall('laundry-e', sourcePlanPoint(936.96, 880.68), sourcePlanPoint(936.96, 979.8)),
    wall('laundry-s', sourcePlanPoint(936.96, 979.8), sourcePlanPoint(787.32, 979.8)),
    wall('laundry-w', sourcePlanPoint(787.32, 979.8), sourcePlanPoint(787.32, 880.68)),
    wall('kitchen-n', sourcePlanPoint(1_082.64, 883.44), sourcePlanPoint(1_175.04, 883.44)),
    wall('kitchen-e', sourcePlanPoint(1_175.04, 883.44), sourcePlanPoint(1_175.04, 979.8)),
    wall('kitchen-s', sourcePlanPoint(1_175.04, 979.8), sourcePlanPoint(954, 979.8)),
    wall('kitchen-w', sourcePlanPoint(954, 979.8), sourcePlanPoint(954, 883.44)),
  ],
  wallMasses: TIFERET_5_1_WALL_MASSES,
  rooms: [
    {
      id: 'safe-room',
      name: 'ממ״ד',
      polygon: sourcePlanRect(627.96, 402.12, 798.12, 577.92),
      wallIds: ['safe-n', 'safe-e', 'safe-s', 'safe-w'],
    },
    {
      id: 'bedroom',
      name: 'חדר שינה',
      polygon: sourcePlanRect(815.04, 395.88, 970.92, 568.8),
      wallIds: ['bed-n', 'bed-e', 'bed-s', 'bed-w'],
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
    },
    {
      id: 'shower',
      name: 'חדר רחצה',
      polygon: sourcePlanRect(629.64, 592.08, 724.32, 686.76),
      wallIds: ['shower-n', 'shower-e', 'shower-s', 'shower-w'],
    },
    {
      id: 'guest-wc',
      name: 'שירותי אורחים',
      polygon: sourcePlanRect(899.52, 574.44, 987.96, 628.92),
      wallIds: ['guest-wc-n', 'guest-wc-e', 'guest-wc-s', 'guest-wc-w'],
    },
    {
      id: 'master',
      name: 'חדר שינה הורים',
      polygon: sourcePlanRect(627.96, 694.08, 849.12, 863.64),
      wallIds: ['master-n', 'master-e', 'master-s', 'master-w'],
    },
    {
      id: 'bath',
      name: 'אמבטיה',
      polygon: sourcePlanRect(856.44, 695.76, 987.96, 793.92),
      wallIds: ['bath-n', 'bath-e', 'bath-s', 'bath-w'],
    },
    {
      id: 'laundry',
      name: 'מסתור כביסה',
      polygon: sourcePlanRect(787.32, 880.68, 936.96, 979.8),
      wallIds: ['laundry-n', 'laundry-e', 'laundry-s', 'laundry-w'],
    },
    {
      id: 'kitchen',
      name: 'מטבח',
      polygon: sourcePlanRect(954, 883.44, 1_175.04, 979.8),
      wallIds: ['kitchen-n', 'kitchen-e', 'kitchen-s', 'kitchen-w'],
    },
  ],
  furniture: [
    createFurniturePlacement('safe-room-guest-bed', 'safe-room', 'single-bed', 650, 1_450, {
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
    createFurniturePlacement('living-media-console', 'living', 'media-console', 9_350, 2_800, {
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
    createFurniturePlacement('living-chair-c', 'living', 'dining-chair', 7_750, 4_750),
    createFurniturePlacement('living-chair-d', 'living', 'dining-chair', 7_750, 6_950, {
      rotation: Math.PI,
    }),
    createFurniturePlacement('living-plant', 'living', 'plant', 9_050, 700),
    createFurniturePlacement('shower-cubicle', 'shower', 'shower', 1_150, 4_300),
    createFurniturePlacement('shower-vanity', 'shower', 'vanity', 430, 3_650, {
      width: 650,
      rotation: Math.PI / 2,
    }),
    createFurniturePlacement('shower-toilet', 'shower', 'toilet', 450, 4_350, {
      rotation: Math.PI / 2,
    }),
    createFurniturePlacement('guest-wc-toilet', 'guest-wc', 'toilet', 5_050, 3_650, {
      depth: 560,
      rotation: Math.PI / 2,
    }),
    createFurniturePlacement('guest-wc-vanity', 'guest-wc', 'vanity', 5_750, 3_570, {
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
    createFurniturePlacement('bath-bathtub', 'bath', 'bathtub', 4_480, 6_600, {
      rotation: Math.PI / 2,
    }),
    createFurniturePlacement('bath-vanity', 'bath', 'vanity', 5_650, 5_250),
    createFurniturePlacement('bath-toilet', 'bath', 'toilet', 5_950, 6_050, {
      rotation: Math.PI / 2,
    }),
    createFurniturePlacement('laundry-washer', 'laundry', 'washer', 3_180, 9_150),
    createFurniturePlacement('laundry-dryer', 'laundry', 'dryer', 3_850, 9_150),
    createFurniturePlacement('kitchen-base-run', 'kitchen', 'kitchen-base-run', 6_950, 9_420),
    createFurniturePlacement('kitchen-wall-run', 'kitchen', 'kitchen-wall-run', 6_950, 9_560),
    createFurniturePlacement('kitchen-sink', 'kitchen', 'sink', 6_750, 9_250),
    createFurniturePlacement('kitchen-oven', 'kitchen', 'oven', 8_350, 9_420),
    createFurniturePlacement('kitchen-fridge', 'kitchen', 'refrigerator', 9_180, 9_400),
  ],
  fixedElements: [
    {
      id: 'sales-plan-balcony',
      roomId: 'living',
      kind: 'balcony-void',
      label: 'מרפסת',
      polygon: sourcePlanRect(806.52, 220.2, 1_180.8, 378.84),
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
      height: 900,
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
      height: 900,
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
