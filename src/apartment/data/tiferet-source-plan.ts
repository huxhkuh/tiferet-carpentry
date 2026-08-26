import type { Point, SourcePdfRect, WallMass } from '../types';

interface AxisAnchor {
  source: number;
  target: number;
}

type PdfRectTuple = readonly [x0: number, top: number, x1: number, bottom: number];

/**
 * Piecewise calibration from the rotated PDF page coordinates to millimetres.
 * Every printed clear-room dimension is an anchor, so the semantic model keeps
 * the stated measurements while retaining the exact vector topology between
 * anchors. Source: official Tiferet sheet 5-1, page 1.
 */
const X_ANCHORS: readonly AxisAnchor[] = [
  { source: 610.92, target: -296 },
  { source: 627.96, target: 0 },
  { source: 629.64, target: 29 },
  { source: 724.32, target: 1_679 },
  { source: 798.12, target: 2_950 },
  { source: 815.04, target: 3_244 },
  { source: 849.12, target: 3_850 },
  { source: 856.44, target: 3_977 },
  { source: 899.52, target: 4_767 },
  { source: 954, target: 5_644 },
  { source: 970.92, target: 5_944 },
  { source: 976.68, target: 6_044 },
  { source: 987.96, target: 6_267 },
  { source: 993.6, target: 6_344 },
  { source: 1_175.04, target: 9_494 },
  { source: 1_192.08, target: 9_790 },
];

const Y_ANCHORS: readonly AxisAnchor[] = [
  { source: 220.2, target: -3_050 },
  { source: 378.84, target: -300 },
  { source: 395.88, target: 0 },
  { source: 402.12, target: 108 },
  { source: 568.8, target: 3_000 },
  { source: 574.44, target: 3_100 },
  { source: 577.92, target: 3_158 },
  { source: 592.08, target: 3_408 },
  { source: 628.92, target: 4_000 },
  { source: 686.76, target: 5_008 },
  { source: 694.08, target: 5_108 },
  { source: 695.76, target: 5_137 },
  { source: 793.92, target: 6_837 },
  { source: 863.64, target: 8_058 },
  { source: 880.68, target: 8_402 },
  { source: 883.44, target: 8_450 },
  { source: 979.8, target: 10_150 },
  { source: 991.2, target: 10_350 },
];

function interpolateAxis(value: number, anchors: readonly AxisAnchor[]): number {
  const upperIndex = anchors.findIndex((anchor) => anchor.source >= value);
  const endIndex = upperIndex <= 0 ? 1 : upperIndex === -1 ? anchors.length - 1 : upperIndex;
  const start = anchors[endIndex - 1];
  const end = anchors[endIndex];
  const ratio = (value - start.source) / (end.source - start.source);
  return Math.round(start.target + ratio * (end.target - start.target));
}

export function sourcePlanPoint(x: number, top: number): Point {
  return { x: interpolateAxis(x, X_ANCHORS), y: interpolateAxis(top, Y_ANCHORS) };
}

export function sourcePlanRect(x0: number, top: number, x1: number, bottom: number): Point[] {
  return [sourcePlanPoint(x0, top), sourcePlanPoint(x1, top), sourcePlanPoint(x1, bottom), sourcePlanPoint(x0, bottom)];
}

export const TIFERET_SOURCE_PLAN_BOUNDS: SourcePdfRect = {
  x0: 610.92,
  x1: 1_192.08,
  top: 220.2,
  bottom: 991.2,
};

// Filled 50% grey rectangles extracted with pdfplumber from the official vector PDF.
const PDF_WALL_RECTANGLES: readonly PdfRectTuple[] = [
  [610.92, 378.84, 806.52, 399.24],
  [800.88, 378.84, 1_192.08, 390.24],
  [800.88, 387.36, 1_180.8, 395.88],
  [970.92, 390.24, 976.68, 568.8],
  [1_180.8, 390.24, 1_192.08, 498],
  [1_175.04, 395.88, 1_180.8, 498],
  [610.92, 399.24, 625.2, 592.08],
  [800.88, 399.24, 812.28, 577.92],
  [619.44, 402.12, 627.96, 577.92],
  [1_175.04, 498, 1_180.8, 806.88],
  [1_180.8, 506.4, 1_186.44, 810.84],
  [893.88, 568.8, 987.96, 574.44],
  [987.96, 568.8, 993.6, 628.92],
  [893.88, 574.44, 899.52, 634.56],
  [625.2, 580.68, 815.04, 592.08],
  [629.64, 586.44, 724.32, 592.08],
  [610.92, 592.08, 622.32, 694.08],
  [620.28, 592.08, 627.96, 686.76],
  [620.28, 592.08, 629.64, 686.76],
  [724.32, 592.08, 735.72, 694.08],
  [724.32, 592.08, 730.08, 686.76],
  [809.4, 592.08, 815.04, 628.92],
  [809.4, 628.92, 893.88, 634.56],
  [899.52, 628.92, 993.6, 634.56],
  [622.32, 688.44, 724.32, 694.08],
  [735.72, 688.44, 852.72, 694.08],
  [852.72, 688.44, 993.6, 694.08],
  [610.92, 694.08, 622.32, 880.68],
  [619.44, 694.08, 627.96, 869.28],
  [849.12, 694.08, 854.76, 869.28],
  [987.96, 694.08, 993.6, 799.56],
  [854.76, 793.92, 897.24, 799.56],
  [948.36, 793.92, 954, 869.28],
  [954, 793.92, 987.96, 799.56],
  [1_175.04, 806.88, 1_180.8, 979.8],
  [1_180.8, 806.88, 1_192.08, 979.8],
  [856.44, 861.96, 946.56, 871.32],
  [627.96, 863.64, 849.12, 869.28],
  [856.44, 863.64, 946.56, 871.32],
  [622.32, 869.28, 856.44, 880.68],
  [856.44, 869.28, 954, 880.68],
  [1_082.64, 877.8, 1_175.04, 883.44],
  [936.96, 880.68, 948.36, 979.8],
  [945.48, 880.68, 954, 979.8],
  [778.2, 979.8, 854.76, 991.2],
  [854.76, 979.8, 945.48, 985.56],
  [945.48, 979.8, 1_192.08, 985.56],
  [854.76, 985.56, 1_192.08, 991.2],
];

export const TIFERET_5_1_WALL_MASSES: WallMass[] = PDF_WALL_RECTANGLES.map(([x0, top, x1, bottom], index) => ({
  id: `tiferet-5-1-wall-mass-${index + 1}`,
  polygon: sourcePlanRect(x0, top, x1, bottom),
  sourcePdfRect: { x0, x1, top, bottom },
}));
