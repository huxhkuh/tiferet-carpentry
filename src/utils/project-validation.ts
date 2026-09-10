import { DEFAULT_CONFIG } from '../engine/materials';
import { generateParts } from '../engine/parts';
import { isCabinetConfig } from '../apartment/persistence/design';
import type { CabinetEntry, ProjectSnapshot } from '../store/cabinet-store';

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function validateProjectCabinets(value: unknown): CabinetEntry[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100)
    throw new TypeError('A project must contain 1–100 cabinets');
  return value.map((entry: unknown) => {
    if (
      !record(entry) ||
      !record(entry.config) ||
      typeof entry.name !== 'string' ||
      !entry.name.trim() ||
      entry.name.length > 500 ||
      (entry.notes !== undefined && (typeof entry.notes !== 'string' || entry.notes.length > 50_000))
    )
      throw new TypeError('Invalid cabinet entry');
    const config = { ...DEFAULT_CONFIG, ...entry.config };
    if (!isCabinetConfig(config)) throw new TypeError('Invalid cabinet configuration or material');
    if (
      generateParts(config).some(
        (part) => ![part.length, part.width, part.thickness].every((value) => Number.isFinite(value) && value > 0),
      )
    )
      throw new TypeError('Cabinet configuration produces invalid part dimensions');
    return { name: entry.name.trim(), config, ...(typeof entry.notes === 'string' ? { notes: entry.notes } : {}) };
  });
}

export function validateProjectSnapshots(value: unknown): ProjectSnapshot[] {
  if (!Array.isArray(value) || value.length > 100) throw new TypeError('Invalid snapshot history');
  const ids = new Set<string>();
  return value.map((item: unknown) => {
    if (
      !record(item) ||
      typeof item.id !== 'string' ||
      !item.id ||
      ids.has(item.id) ||
      typeof item.name !== 'string' ||
      !item.name.trim() ||
      typeof item.timestamp !== 'string' ||
      !Number.isFinite(Date.parse(item.timestamp))
    )
      throw new TypeError('Invalid snapshot');
    ids.add(item.id);
    return {
      id: item.id,
      name: item.name,
      timestamp: item.timestamp,
      cabinets: validateProjectCabinets(item.cabinets),
    };
  });
}
