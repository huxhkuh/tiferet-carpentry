import type { CutSheet, CutRect } from '../engine/types';
import { triggerDownload } from './download';
import { validateGcode, type GcodeValidationResult } from '../engine/gcode-validator';
import { applyGcodePlugins } from '../engine/plugin';
import { appendChecksumToGcode } from './checksum';
import { GCODE_SCHEMA_VERSION } from '../engine/export-schema';
import { buildZip, downloadZip } from './zip-writer';
import { utf8Encode } from './browser-compat';

/**
 * Generate basic G-code for a CNC router to cut parts from a sheet.
 * Uses simple rectangular profiling cuts with tabs.
 * Assumes origin at bottom-left of sheet, Z0 at material surface.
 *
 * Parameters are conservative defaults for a typical hobby CNC router.
 */
export interface GcodeOptions {
  feedRate: number; // mm/min XY cutting feed (default 1500)
  plungeRate: number; // mm/min Z plunge feed (default 600)
  safeZ: number; // mm safe retract height (default 5)
  cutDepth: number; // mm total cut depth (material thickness)
  passDepth: number; // mm depth per pass (default 3)
  toolDiameter: number; // mm router bit diameter (default 6)
  /**
   * When true, `circularPocketToGcode` emits G2/G3 arc commands instead of
   * linear approximations. Has no effect on rectangular profile cuts.
   */
  useArcs: boolean;
  /**
   * Sprint 17 — when true, emits an M5 (spindle stop) + M6 T1 (tool change) +
   * M3 S18000 (spindle restart) sequence between parts on a sheet. Lets the
   * operator pause to swap tools or inspect cuts on machines without an
   * automatic tool-changer. Defaults to false.
   */
  emitToolChange: boolean;
  tabWidth?: number;
  tabHeight?: number;
}

const DEFAULTS: GcodeOptions = {
  feedRate: 1500,
  plungeRate: 600,
  safeZ: 5,
  cutDepth: 18,
  passDepth: 3,
  toolDiameter: 6,
  useArcs: false,
  emitToolChange: false,
  tabWidth: 8,
  tabHeight: 2,
};

function validateOptions(options: GcodeOptions): void {
  for (const value of [
    options.feedRate,
    options.plungeRate,
    options.safeZ,
    options.cutDepth,
    options.passDepth,
    options.toolDiameter,
  ]) {
    if (!Number.isFinite(value) || value <= 0) throw new RangeError('CNC parameters must be finite positive numbers');
  }
  if (Math.ceil(options.cutDepth / options.passDepth) > 500) throw new RangeError('Too many cutting passes');
  if (![options.tabWidth ?? 8, options.tabHeight ?? 2].every((value) => Number.isFinite(value) && value >= 0))
    throw new RangeError('Invalid holding tabs');
}

function validateToolClearance(sheet: CutSheet, diameter: number): void {
  if (
    ![sheet.sheetWidth, sheet.sheetLength, sheet.thickness].every((value) => Number.isFinite(value) && value > 0) ||
    !Number.isInteger(sheet.sheetIndex) ||
    sheet.sheetIndex < 0
  )
    throw new RangeError('Invalid CNC sheet dimensions or index');
  for (let i = 0; i < sheet.parts.length; i++) {
    const a = sheet.parts[i];
    if (
      ![a.x, a.y, a.width, a.length].every(Number.isFinite) ||
      a.width <= 0 ||
      a.length <= 0 ||
      a.x < 0 ||
      a.y < 0 ||
      a.x + a.width > sheet.sheetWidth ||
      a.y + a.length > sheet.sheetLength
    )
      throw new RangeError('A part is outside the CNC sheet');
    for (const b of sheet.parts.slice(i + 1)) {
      const gapX = Math.max(a.x - b.x - b.width, b.x - a.x - a.width, 0);
      const gapY = Math.max(a.y - b.y - b.length, b.y - a.y - a.length, 0);
      if (Math.hypot(gapX, gapY) < diameter - 1e-6)
        throw new RangeError(
          `CNC tool ${diameter} mm requires more space between ${a.partId} and ${b.partId}. Re-optimize with a kerf of at least ${diameter} mm.`,
        );
    }
  }
}

/** Keep user-controlled labels on one comment line, never as machine instructions. */
function commentText(value: string): string {
  return Array.from(value, (character) =>
    character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 ? ' ' : character,
  ).join('');
}

/**
 * Generate G-code for cutting all parts from a single sheet.
 * Tool compensation is applied (offset outward by toolDiameter/2).
 */
export function cutSheetToGcode(sheet: CutSheet, opts?: Partial<GcodeOptions>): string {
  const o = { ...DEFAULTS, ...opts, cutDepth: opts?.cutDepth ?? sheet.thickness };
  validateOptions(o);
  validateToolClearance(sheet, o.toolDiameter);
  const offset = o.toolDiameter / 2;
  const lines: string[] = [];

  // Header
  const generatedAt = new Date().toISOString();
  lines.push(`; Cabinet Planner G-code Export`);
  lines.push(`; Version: ${__APP_VERSION__}  Schema: ${GCODE_SCHEMA_VERSION}`);
  lines.push(`; Generated: ${generatedAt}`);
  lines.push(`; G-code for sheet ${sheet.sheetIndex + 1} - ${commentText(sheet.material)} ${sheet.thickness}mm`);
  lines.push(`; Sheet size: ${sheet.sheetWidth} x ${sheet.sheetLength} mm`);
  lines.push(`; Tool diameter: ${o.toolDiameter} mm, Feed: ${o.feedRate} mm/min`);
  lines.push(`; Parts: ${sheet.parts.length}`);
  lines.push('');
  lines.push('G21 ; mm mode');
  lines.push('G90 ; absolute positioning');
  lines.push(`G0 Z${o.safeZ.toFixed(1)} ; retract to safe height`);
  lines.push('M3 S18000 ; spindle on');
  lines.push('');

  for (let i = 0; i < sheet.parts.length; i++) {
    const part = sheet.parts[i]!;
    if (i > 0 && o.emitToolChange) {
      // Sprint 17 — pause between parts for tool inspection / change.
      lines.push('; --- Tool-change pause ---');
      lines.push(`G0 Z${o.safeZ.toFixed(1)} ; retract before tool change`);
      lines.push('M5 ; spindle off');
      lines.push('M6 T1 ; tool change');
      lines.push('M3 S18000 ; spindle on');
      lines.push('');
    }
    lines.push(`; --- Cut: ${commentText(part.partId)} ${commentText(part.label)} (${part.width}x${part.length}) ---`);
    addPartProfile(lines, part, o, offset);
    lines.push('');
  }

  // Footer
  lines.push(`G0 Z${o.safeZ.toFixed(1)} ; retract`);
  lines.push('M5 ; spindle off');
  lines.push('G0 X0 Y0 ; return to origin');
  lines.push('M2 ; program end');

  // Phase 13 / Sprint 17 — run any registered onGcodeGenerated plugin hooks
  return applyGcodePlugins(lines.join('\n'));
}

function addPartProfile(lines: string[], part: CutRect, opts: GcodeOptions, offset: number) {
  // Outer profile cut — offset outward from part edges
  const x1 = part.x - offset;
  const y1 = part.y - offset;
  const x2 = part.x + part.width + offset;
  const y2 = part.y + part.length + offset;

  const passes = Math.ceil(opts.cutDepth / opts.passDepth);

  // Rapid to start position
  lines.push(`G0 X${x1.toFixed(2)} Y${y1.toFixed(2)}`);

  for (let p = 1; p <= passes; p++) {
    const z = -Math.min(p * opts.passDepth, opts.cutDepth);

    // Plunge
    lines.push(`G1 Z${z.toFixed(2)} F${opts.plungeRate}`);

    // Cut rectangle CW: bottom→right→top→left→close
    const corners = [
      [x1, y1],
      [x2, y1],
      [x2, y2],
      [x1, y2],
      [x1, y1],
    ];
    for (let side = 1; side < corners.length; side++) {
      const [ax, ay] = corners[side - 1],
        [bx, by] = corners[side];
      const length = Math.hypot(bx - ax, by - ay);
      const tabWidth = Math.min(opts.tabWidth ?? 8, length / 3);
      const tabZ = -Math.max(0, opts.cutDepth - (opts.tabHeight ?? 2));
      if (tabWidth > 0 && (opts.tabHeight ?? 2) > 0 && z < tabZ) {
        const first = (length - tabWidth) / (2 * length),
          last = (length + tabWidth) / (2 * length);
        const tx = ax + (bx - ax) * first,
          ty = ay + (by - ay) * first;
        const ux = ax + (bx - ax) * last,
          uy = ay + (by - ay) * last;
        lines.push(`G1 X${tx.toFixed(2)} Y${ty.toFixed(2)} F${opts.feedRate}`);
        lines.push(`G1 X${tx.toFixed(2)} Y${ty.toFixed(2)} Z${tabZ.toFixed(2)} ; holding tab`);
        lines.push(`G1 X${ux.toFixed(2)} Y${uy.toFixed(2)}`);
        lines.push(`G1 X${ux.toFixed(2)} Y${uy.toFixed(2)} Z${z.toFixed(2)} F${opts.plungeRate}`);
      }
      lines.push(`G1 X${bx.toFixed(2)} Y${by.toFixed(2)} F${opts.feedRate}`);
    }
  }

  // Retract after part
  lines.push(`G0 Z${opts.safeZ.toFixed(1)}`);
}

/** Trigger G-code download for a single sheet. Returns validation results. */
export function downloadGcodeForSheet(
  sheet: CutSheet,
  filename: string,
  opts?: Partial<GcodeOptions>,
): GcodeValidationResult {
  const content = cutSheetToGcode(sheet, opts);
  const validation = validateGcode(content);
  triggerDownload(content, 'text/plain', filename);
  return validation;
}

/** Separate machine jobs: each sheet ends once and is identified in the manifest. */
export async function downloadAllSheetsGcode(
  sheets: CutSheet[],
  projectName: string,
  opts?: Partial<GcodeOptions>,
): Promise<void> {
  const entries = await Promise.all(
    sheets.map(async (sheet, index) => ({
      name: `sheet-${index + 1}.nc`,
      data: utf8Encode(await appendChecksumToGcode(cutSheetToGcode(sheet, opts))),
    })),
  );
  entries.push({
    name: 'manifest.json',
    data: utf8Encode(
      JSON.stringify(
        {
          projectName,
          units: 'mm',
          jobs: sheets.map((sheet, index) => ({
            file: `sheet-${index + 1}.nc`,
            material: sheet.material,
            thickness: sheet.thickness,
            sheetWidth: sheet.sheetWidth,
            sheetLength: sheet.sheetLength,
          })),
          setup:
            'Load and secure each sheet separately. Verify work origin, tool, clamps and controller simulation before running.',
        },
        null,
        2,
      ),
    ),
  });
  downloadZip(buildZip(entries), `${projectName}-cnc-jobs.zip`);
}

/**
 * Generate G-code for a circular pocket (e.g. hinge cup, shelf-pin hole).
 *
 * When `opts.useArcs` is **true** (default for this function), the cut
 * circles are output as `G2` arc commands — the preferred method for CNC
 * controllers with arc interpolation.  When `opts.useArcs` is **false**, the
 * circle is approximated using a 36-sided polygon of `G1` linear moves.
 *
 * Coordinate system: X/Y are the centre of the pocket; Z0 is the material
 * surface. The tool starts and ends at safe-Z.
 *
 * @param cx - X coordinate of pocket centre (mm)
 * @param cy - Y coordinate of pocket centre (mm)
 * @param radius - Pocket radius (mm); e.g. 17.5 for a 35 mm hinge cup
 * @param opts - GcodeOptions (merged with DEFAULTS)
 * @returns G-code string for the circular pocket
 */
export function circularPocketToGcode(cx: number, cy: number, radius: number, opts?: Partial<GcodeOptions>): string {
  const o: GcodeOptions = { ...DEFAULTS, ...opts };
  validateOptions(o);
  if (![cx, cy, radius].every(Number.isFinite) || radius <= 0 || o.toolDiameter > radius * 2)
    throw new RangeError('Pocket geometry must fit the selected tool');
  const lines: string[] = [];
  const cutR = radius - o.toolDiameter / 2; // compensated cut radius

  if (cutR <= 0) {
    // Tool is larger than or equal to the pocket — single plunge at centre
    lines.push(`; Circular pocket r=${radius} mm at (${cx.toFixed(2)},${cy.toFixed(2)}) — plunge only (tool≥pocket)`);
    lines.push(`G0 X${cx.toFixed(2)} Y${cy.toFixed(2)}`);
    const passes = Math.ceil(o.cutDepth / o.passDepth);
    for (let p = 1; p <= passes; p++) {
      const z = -Math.min(p * o.passDepth, o.cutDepth);
      lines.push(`G1 Z${z.toFixed(2)} F${o.plungeRate}`);
    }
    lines.push(`G0 Z${o.safeZ.toFixed(1)}`);
    return lines.join('\n');
  }

  const startX = cx + cutR; // entry point on the +X side of the circle

  lines.push(
    `; Circular pocket r=${radius} mm at (${cx.toFixed(2)},${cy.toFixed(2)}) — ${o.useArcs ? 'G2 arc' : 'G1 polygon'} mode`,
  );
  lines.push(`G0 X${startX.toFixed(2)} Y${cy.toFixed(2)}`);

  const passes = Math.ceil(o.cutDepth / o.passDepth);

  for (let p = 1; p <= passes; p++) {
    const z = -Math.min(p * o.passDepth, o.cutDepth);
    lines.push(`G1 Z${z.toFixed(2)} F${o.plungeRate}`);

    if (o.useArcs) {
      // Full-circle G2 arc: I is offset from current pos to centre (−cutR on X)
      lines.push(`G2 I${(-cutR).toFixed(3)} J0.000 F${o.feedRate} ; full CW arc`);
    } else {
      // 36-point polygon approximation (10° steps)
      const STEPS = 36;
      for (let s = 1; s <= STEPS; s++) {
        const angle = (s / STEPS) * 2 * Math.PI;
        const px = cx + cutR * Math.cos(angle);
        const py = cy + cutR * Math.sin(angle);
        lines.push(`G1 X${px.toFixed(3)} Y${py.toFixed(3)} F${o.feedRate}`);
      }
    }
  }

  lines.push(`G0 Z${o.safeZ.toFixed(1)}`);
  return lines.join('\n');
}
