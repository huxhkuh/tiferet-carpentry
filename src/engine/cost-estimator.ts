import type { OptimizationResult } from './types';
import { resolveMaterial } from './materials.ts';

export interface CostBreakdown {
  /** Entries excluded from the subtotal because an ILS price is unavailable. */
  missingPrices?: string[];
  currencyCode?: 'ILS';
  sheetCosts: SheetCost[];
  hardwareItems: HardwareCost[];
  edgeBandingCost: number;
  hardwareCost: number;
  wasteCost: number;
  /** Estimated labour hours (assembly + finishing) — v3.23.0 */
  labourHours: number;
  /** Labour cost in ₪ (labourHours × labourRate) — v3.23.0 */
  labourCost: number;
  /** Finish/paint cost (user-supplied, ₪) — v3.23.0 */
  finishCost: number;
  totalMaterialCost: number;
  totalCost: number;
}

export interface SheetCost {
  material: string;
  materialName: { en: string; he: string };
  thickness: number;
  qty: number;
  pricePerSheet: number;
  subtotal: number;
  priceMissing?: boolean;
}

export interface HardwareCost {
  id: string;
  name: { en: string; he: string };
  qty: number;
  unitPrice: number;
  subtotal: number;
  priceMissing?: boolean;
}

/** Estimated hardware prices (₪) by semantic key OR hardware H-id */
const HARDWARE_PRICES: Record<string, number> = {
  hinge: 12,
  'mounting-plate': 6,
  'shelf-pin': 0.5,
  confirmat: 0.8,
  handle: 15,
  'L-bracket': 4,
  'wood-glue': 25,
  // H-id aliases
  H01: 12, // Euro Hinge
  H02: 6, // Hinge Mounting Plate
  H03: 0.5, // Shelf Pin
  H04: 0.8, // Confirmat Screw
  H05: 0.3, // Confirmat Cover Cap
  H06: 0.2, // Back Panel Nail
  H07: 4, // L-Bracket
  H08: 1.5, // Wall Screw + Dowel
  H09: 15, // Handle
  H10: 25, // Wood Glue
};

/** Edge banding price per meter (₪) */
const EDGE_BANDING_PER_METER = 3;

/** Default labour rate ₪ per hour (v3.23.0) */
export const DEFAULT_LABOUR_RATE = 75;

/**
 * Estimate the total cost of a cabinet project based on optimization results
 * and hardware/edge banding quantities.
 *
 * Sprint 139: accepts optional `priceOverrides` map of materialKey → price per sheet (₪).
 * Sprint 141: accepts optional `edgeBandingRate` (₪/m, default EDGE_BANDING_PER_METER).
 * Sprint 148: accepts optional `hardwarePriceOverrides` map of hw.id → unit price (₪).
 * v3.23.0:   accepts optional `labourRate` (₪/hr), `labourHours`, `finishCost`.
 */
export function estimateCost(
  optimization: OptimizationResult,
  hardware: { id: string; qty: number; unitPrice?: number; name?: { en: string; he: string } }[],
  edgeBandingTotal: number,
  priceOverrides: Record<string, number> = {},
  edgeBandingRate: number = EDGE_BANDING_PER_METER,
  hardwarePriceOverrides: Record<string, number> = {},
  labourRate: number = DEFAULT_LABOUR_RATE,
  labourHours: number = 0,
  finishCost: number = 0,
): CostBreakdown {
  // Group sheets by material
  const sheetMap = new Map<string, { qty: number; mat: ReturnType<typeof resolveMaterial> }>();
  for (const sheet of optimization.sheets) {
    const key = `${sheet.material}-${sheet.thickness}`;
    const existing = sheetMap.get(key);
    if (existing) {
      existing.qty++;
    } else {
      sheetMap.set(key, { qty: 1, mat: resolveMaterial(sheet) });
    }
  }

  const sheetCosts: SheetCost[] = [];
  const missingPrices: string[] = [];
  let totalMaterialCost = 0;
  for (const [, { qty, mat }] of sheetMap) {
    // Sprint 139: use override price if present, otherwise mat.pricePerSheet
    const quotedPrice =
      priceOverrides[mat.key] ?? (!mat.currencyCode || mat.currencyCode === 'ILS' ? mat.pricePerSheet : undefined);
    const priceMissing = quotedPrice === undefined || !Number.isFinite(quotedPrice) || quotedPrice < 0;
    const price = priceMissing ? 0 : quotedPrice;
    if (priceMissing) missingPrices.push(mat.key);
    const subtotal = qty * price;
    sheetCosts.push({
      priceMissing,
      material: mat.key,
      materialName: mat.name,
      thickness: mat.thickness,
      qty,
      pricePerSheet: price,
      subtotal,
    });
    totalMaterialCost += subtotal;
  }

  // Edge banding
  const edgeBandingCost = Math.round((edgeBandingTotal / 1000) * edgeBandingRate);

  // Hardware — Sprint 148: per-item breakdown with price overrides
  // H16 is the purchasing unit for banding already costed by length above.
  const hardwareItems: HardwareCost[] = hardware
    .filter((hw) => hw.id !== 'H16')
    .map((hw) => {
      const price = hardwarePriceOverrides[hw.id] ?? hw.unitPrice ?? HARDWARE_PRICES[hw.id];
      const priceMissing = price === undefined || !Number.isFinite(price) || price < 0;
      const unitPrice = priceMissing ? 0 : price;
      if (priceMissing) missingPrices.push(hw.id);
      return {
        priceMissing,
        id: hw.id,
        name: hw.name ?? { en: hw.id, he: hw.id },
        qty: hw.qty,
        unitPrice,
        subtotal: Math.round(hw.qty * unitPrice * 10) / 10,
      };
    });
  const hardwareCost = Math.round(hardwareItems.reduce((sum, h) => sum + h.subtotal, 0) * 10) / 10;

  // Waste cost — proportional value of wasted material
  const wastePercent = optimization.sheets.length > 0 ? (100 - optimization.overallYield) / 100 : 0;
  const wasteCost = Math.round(totalMaterialCost * wastePercent);

  const labourCost = Math.round(labourHours * labourRate);

  return {
    missingPrices,
    currencyCode: 'ILS',
    sheetCosts,
    hardwareItems,
    edgeBandingCost,
    hardwareCost,
    wasteCost,
    labourHours,
    labourCost,
    finishCost: Math.round(finishCost),
    totalMaterialCost,
    totalCost: totalMaterialCost + edgeBandingCost + hardwareCost + labourCost + Math.round(finishCost),
  };
}
