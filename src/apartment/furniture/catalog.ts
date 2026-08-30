import type { FurnitureKind, FurniturePalette, FurniturePlacement } from '../types';
import type { Apartment, CabinetPlacement, Room } from '../types';
import { validateFurnitureMove } from '../geometry/scene-collision';

/**
 * Catalogue shape adapted from the MIT-licensed openPlan3D furniture catalogue:
 * https://github.com/laanlabs/openPlan3D
 * Names, dimensions, palettes and all product-specific data below were rewritten
 * for the Tiferet apartment planner. See THIRD_PARTY_NOTICES.md.
 */

export type FurnitureCategory = 'bedroom' | 'living' | 'dining' | 'kitchen' | 'bathroom' | 'utility' | 'decor';

interface PaletteColors {
  primary: string;
  accent: string;
  soft: string;
}

export interface FurnitureDefinition {
  kind: FurnitureKind;
  label: string;
  category: FurnitureCategory;
  width: number;
  depth: number;
  height: number;
  elevation?: number;
}

export const FURNITURE_PALETTES: Readonly<Record<FurniturePalette, PaletteColors>> = {
  warm: { primary: '#9A7457', accent: '#5F4636', soft: '#E7D8C5' },
  light: { primary: '#D5CFC3', accent: '#7C756A', soft: '#F4EFE6' },
  sage: { primary: '#8A9A83', accent: '#4F6254', soft: '#DCE2D5' },
};

export const FURNITURE_CATALOG: Readonly<Record<FurnitureKind, FurnitureDefinition>> = {
  'single-bed': { kind: 'single-bed', label: 'מיטת יחיד', category: 'bedroom', width: 900, depth: 1_950, height: 900 },
  'double-bed': {
    kind: 'double-bed',
    label: 'מיטה זוגית',
    category: 'bedroom',
    width: 1_600,
    depth: 2_000,
    height: 950,
  },
  nightstand: { kind: 'nightstand', label: 'שידת לילה', category: 'bedroom', width: 450, depth: 400, height: 520 },
  desk: { kind: 'desk', label: 'שולחן כתיבה', category: 'bedroom', width: 1_100, depth: 550, height: 750 },
  bookshelf: { kind: 'bookshelf', label: 'ספרייה', category: 'bedroom', width: 900, depth: 320, height: 1_900 },
  sofa: { kind: 'sofa', label: 'ספה', category: 'living', width: 2_400, depth: 900, height: 820 },
  'coffee-table': {
    kind: 'coffee-table',
    label: 'שולחן סלון',
    category: 'living',
    width: 1_100,
    depth: 600,
    height: 380,
  },
  rug: { kind: 'rug', label: 'שטיח', category: 'decor', width: 2_600, depth: 1_900, height: 18 },
  'media-console': {
    kind: 'media-console',
    label: 'מזנון טלוויזיה',
    category: 'living',
    width: 1_700,
    depth: 380,
    height: 520,
  },
  'dining-table': {
    kind: 'dining-table',
    label: 'שולחן אוכל',
    category: 'dining',
    width: 1_700,
    depth: 900,
    height: 750,
  },
  'dining-chair': { kind: 'dining-chair', label: 'כיסא אוכל', category: 'dining', width: 480, depth: 520, height: 880 },
  plant: { kind: 'plant', label: 'צמח', category: 'decor', width: 520, depth: 520, height: 1_150 },
  'kitchen-base-run': {
    kind: 'kitchen-base-run',
    label: 'ארונות מטבח תחתונים',
    category: 'kitchen',
    width: 2_100,
    depth: 600,
    height: 900,
  },
  'kitchen-wall-run': {
    kind: 'kitchen-wall-run',
    label: 'ארונות מטבח עליונים',
    category: 'kitchen',
    width: 1_900,
    depth: 360,
    height: 720,
    elevation: 1_420,
  },
  refrigerator: { kind: 'refrigerator', label: 'מקרר', category: 'kitchen', width: 700, depth: 700, height: 1_900 },
  oven: { kind: 'oven', label: 'תנור בילט־אין', category: 'kitchen', width: 600, depth: 580, height: 900 },
  sink: { kind: 'sink', label: 'כיור מטבח', category: 'kitchen', width: 720, depth: 480, height: 80, elevation: 910 },
  vanity: { kind: 'vanity', label: 'ארון רחצה', category: 'bathroom', width: 850, depth: 480, height: 850 },
  toilet: { kind: 'toilet', label: 'אסלה', category: 'bathroom', width: 420, depth: 680, height: 760 },
  shower: { kind: 'shower', label: 'מקלחון', category: 'bathroom', width: 850, depth: 850, height: 2_050 },
  bathtub: { kind: 'bathtub', label: 'אמבטיה', category: 'bathroom', width: 1_600, depth: 750, height: 580 },
  washer: { kind: 'washer', label: 'מכונת כביסה', category: 'utility', width: 620, depth: 650, height: 860 },
  dryer: { kind: 'dryer', label: 'מייבש כביסה', category: 'utility', width: 620, depth: 650, height: 860 },
};

export interface FurnitureAppearance {
  primary: string;
  accent: string;
  soft: string;
}

export function getFurnitureAppearance(placement: FurniturePlacement, palette: FurniturePalette): FurnitureAppearance {
  const colors = FURNITURE_PALETTES[palette];
  return {
    primary: placement.color ?? colors.primary,
    accent: placement.accentColor ?? colors.accent,
    soft: colors.soft,
  };
}

export function createFurniturePlacement(
  id: string,
  roomId: string,
  kind: FurnitureKind,
  x: number,
  y: number,
  overrides: Partial<Omit<FurniturePlacement, 'id' | 'roomId' | 'kind' | 'label' | 'x' | 'y'>> = {},
): FurniturePlacement {
  const definition = FURNITURE_CATALOG[kind];
  return {
    id,
    roomId,
    kind,
    label: definition.label,
    x,
    y,
    width: definition.width,
    depth: definition.depth,
    height: definition.height,
    elevation: definition.elevation ?? 0,
    rotation: 0,
    ...overrides,
  };
}

export interface PlaceFurnitureRequest {
  id: string;
  room: Room;
  kind: FurnitureKind;
  existingFurniture: readonly FurniturePlacement[];
  placements?: readonly CabinetPlacement[];
  apartment?: Apartment;
  template?: FurniturePlacement;
}

function roomBounds(room: Room): { minX: number; minY: number; maxX: number; maxY: number } {
  return {
    minX: Math.min(...room.polygon.map((point) => point.x)),
    minY: Math.min(...room.polygon.map((point) => point.y)),
    maxX: Math.max(...room.polygon.map((point) => point.x)),
    maxY: Math.max(...room.polygon.map((point) => point.y)),
  };
}

function candidatePositions(room: Room): { x: number; y: number }[] {
  const bounds = roomBounds(room);
  const centre = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  const step = Math.max(100, Math.ceil(span / 100));
  const positions = [centre];
  for (let y = bounds.minY + step / 2; y < bounds.maxY; y += step) {
    for (let x = bounds.minX + step / 2; x < bounds.maxX; x += step) {
      positions.push({ x, y });
    }
  }
  return positions.sort(
    (left, right) =>
      (left.x - centre.x) ** 2 + (left.y - centre.y) ** 2 - ((right.x - centre.x) ** 2 + (right.y - centre.y) ** 2),
  );
}

export function placeFurnitureInRoom({
  id,
  room,
  kind,
  existingFurniture,
  placements = [],
  apartment,
  template,
}: PlaceFurnitureRequest): FurniturePlacement {
  const positions = candidatePositions(room);
  const rotations = template ? [template.rotation, template.rotation + Math.PI / 2] : [0, Math.PI / 2];
  const templateOverrides = template
    ? {
        width: template.width,
        depth: template.depth,
        height: template.height,
        elevation: template.elevation,
        color: template.color,
        accentColor: template.accentColor,
      }
    : {};
  for (const rotation of rotations) {
    for (const position of positions) {
      const candidate = createFurniturePlacement(id, room.id, kind, position.x, position.y, {
        ...templateOverrides,
        rotation,
      });
      if (validateFurnitureMove(room, candidate, placements, apartment, existingFurniture) === null) return candidate;
    }
  }
  throw new RangeError(`אין בחדר מקום פנוי עבור ${FURNITURE_CATALOG[kind].label}`);
}
