import type { CabinetPlacement, Wall } from '../types';
import { wallLength } from './wall-frame';

export interface WallSegment {
  start: number;
  end: number;
}

export interface WallAvailabilityOptions {
  placements?: readonly CabinetPlacement[];
  clearance?: number;
  excludePlacementId?: string;
}

const INVALID_DIMENSIONS_MESSAGE = 'מידות הארון חייבות להיות מספרים חיוביים';
const OUTSIDE_WALL_MESSAGE = 'הארון רחב מהשטח הזמין בקיר';
const OPENING_OVERLAP_MESSAGE = 'מיקום הארון חופף לפתח בקיר';
const CABINET_OVERLAP_MESSAGE = 'מיקום הארון חופף לארון קיים';

const intervalsOverlap = (first: WallSegment, second: WallSegment): boolean =>
  first.start < second.end && first.end > second.start;

function mergeIntervals(intervals: readonly WallSegment[]): WallSegment[] {
  const sorted = [...intervals]
    .filter((interval) => interval.end > interval.start)
    .sort((first, second) => first.start - second.start || first.end - second.end);
  return sorted.reduce<WallSegment[]>((merged, interval) => {
    const previous = merged.at(-1);
    if (!previous || interval.start > previous.end) return [...merged, { ...interval }];
    return [...merged.slice(0, -1), { start: previous.start, end: Math.max(previous.end, interval.end) }];
  }, []);
}

function clipInterval(interval: WallSegment, length: number): WallSegment | null {
  const clipped = {
    start: Math.max(0, interval.start),
    end: Math.min(length, interval.end),
  };
  return clipped.end > clipped.start ? clipped : null;
}

export function occupiedWallIntervals(
  wall: Wall,
  { placements = [], clearance = 0, excludePlacementId }: WallAvailabilityOptions = {},
): WallSegment[] {
  const length = wallLength(wall);
  const openingIntervals = wall.openings.map((opening) => ({
    start: opening.offset - clearance,
    end: opening.offset + opening.width + clearance,
  }));
  const cabinetIntervals = placements
    .filter((placement) => placement.wallId === wall.id && placement.id !== excludePlacementId)
    .map((placement) => ({
      start: placement.distanceFromWallStart - clearance,
      end: placement.distanceFromWallStart + placement.width + clearance,
    }));
  return mergeIntervals(
    [...openingIntervals, ...cabinetIntervals]
      .map((interval) => clipInterval(interval, length))
      .filter((interval): interval is WallSegment => interval !== null),
  );
}

export function getUsableWallIntervals(wall: Wall, options: WallAvailabilityOptions = {}): WallSegment[] {
  const length = wallLength(wall);
  const occupied = occupiedWallIntervals(wall, options);
  const usable: WallSegment[] = [];
  let cursor = 0;
  for (const interval of occupied) {
    if (interval.start > cursor) usable.push({ start: cursor, end: interval.start });
    cursor = Math.max(cursor, interval.end);
  }
  if (cursor < length) usable.push({ start: cursor, end: length });
  return usable;
}

/** Compatibility alias retained for the first planner UI. */
export function getAvailableWallSegments(wall: Wall): WallSegment[] {
  return getUsableWallIntervals(wall);
}

export function findFirstFit(wall: Wall, width: number, options: WallAvailabilityOptions = {}): number | null {
  if (!Number.isFinite(width) || width <= 0) return null;
  const segment = getUsableWallIntervals(wall, options).find((candidate) => candidate.end - candidate.start >= width);
  return segment?.start ?? null;
}

export function validatePlacement(
  wall: Wall,
  width: number,
  distanceFromWallStart = 0,
  placements: readonly CabinetPlacement[] = [],
  excludePlacementId?: string,
): string | null {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(distanceFromWallStart) || distanceFromWallStart < 0) {
    return INVALID_DIMENSIONS_MESSAGE;
  }
  const candidate = { start: distanceFromWallStart, end: distanceFromWallStart + width };
  if (candidate.end > wallLength(wall)) return OUTSIDE_WALL_MESSAGE;
  const openingOverlap = wall.openings.some((opening) =>
    intervalsOverlap(candidate, { start: opening.offset, end: opening.offset + opening.width }),
  );
  if (openingOverlap) return OPENING_OVERLAP_MESSAGE;
  const cabinetOverlap = placements.some(
    (placement) =>
      placement.wallId === wall.id &&
      placement.id !== excludePlacementId &&
      intervalsOverlap(candidate, {
        start: placement.distanceFromWallStart,
        end: placement.distanceFromWallStart + placement.width,
      }),
  );
  return cabinetOverlap ? CABINET_OVERLAP_MESSAGE : null;
}

export function isPlacementValid(
  wall: Wall,
  width: number,
  distanceFromWallStart = 0,
  placements: readonly CabinetPlacement[] = [],
  excludePlacementId?: string,
): boolean {
  return validatePlacement(wall, width, distanceFromWallStart, placements, excludePlacementId) === null;
}
