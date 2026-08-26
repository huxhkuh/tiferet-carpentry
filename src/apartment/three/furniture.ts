import { getFurnitureAppearance } from '../furniture/catalog';
import type { FurniturePalette, FurniturePlacement } from '../types';

/**
 * Composite low-poly furniture approach adapted from Casita's MIT-licensed
 * box-based furniture pieces: https://github.com/rohitguta2432/casita
 * Every model and dimension below was substantially rewritten for this
 * renderer and the Tiferet millimetre domain. See THIRD_PARTY_NOTICES.md.
 */

export interface FurniturePrimitive {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  yaw: number;
  color: string;
}

function box(
  x: number,
  bottom: number,
  z: number,
  width: number,
  height: number,
  depth: number,
  color: string,
  yaw = 0,
): FurniturePrimitive {
  return { x, y: bottom + height / 2, z, width, height, depth, yaw, color };
}

function fourLegs(item: FurniturePlacement, topBottom: number, color: string): FurniturePrimitive[] {
  const insetX = item.width * 0.39;
  const insetZ = item.depth * 0.36;
  const legSize = Math.min(70, Math.min(item.width, item.depth) * 0.12);
  return [-1, 1].flatMap((xDirection) =>
    [-1, 1].map((zDirection) => box(insetX * xDirection, 0, insetZ * zDirection, legSize, topBottom, legSize, color)),
  );
}

function bedPrimitives(item: FurniturePlacement, palette: FurniturePalette): FurniturePrimitive[] {
  const appearance = getFurnitureAppearance(item, palette);
  const frameHeight = 260;
  const mattressHeight = 210;
  const headboardHeight = Math.max(720, item.height);
  const pillowCount = item.kind === 'double-bed' ? 2 : 1;
  const pillowWidth = item.width / pillowCount - 140;
  const pillows = Array.from({ length: pillowCount }, (_, index) => {
    const x = -item.width / 2 + pillowWidth / 2 + 70 + index * (item.width / pillowCount);
    return box(x, frameHeight + mattressHeight + 35, -item.depth * 0.32, pillowWidth, 90, 360, '#F4EFE6');
  });
  return [
    box(0, 80, 0, item.width, frameHeight - 80, item.depth, appearance.accent),
    box(0, frameHeight, 0, item.width - 70, mattressHeight, item.depth - 90, appearance.soft),
    box(
      0,
      frameHeight + mattressHeight,
      item.depth * 0.13,
      item.width - 110,
      65,
      item.depth * 0.58,
      appearance.primary,
    ),
    box(0, 0, -item.depth / 2 + 45, item.width + 60, headboardHeight, 90, appearance.accent),
    ...pillows,
  ];
}

function tablePrimitives(item: FurniturePlacement, palette: FurniturePalette, topHeight: number): FurniturePrimitive[] {
  const appearance = getFurnitureAppearance(item, palette);
  const topThickness = Math.max(45, item.height * 0.09);
  return [
    box(0, topHeight - topThickness, 0, item.width, topThickness, item.depth, appearance.primary),
    ...fourLegs(item, topHeight - topThickness, appearance.accent),
  ];
}

function chairPrimitives(item: FurniturePlacement, palette: FurniturePalette): FurniturePrimitive[] {
  const appearance = getFurnitureAppearance(item, palette);
  const seatHeight = 450;
  return [
    box(0, seatHeight, 0, item.width * 0.88, 90, item.depth * 0.8, appearance.primary),
    box(0, seatHeight + 70, item.depth * 0.37, item.width * 0.88, item.height - seatHeight, 80, appearance.accent),
    ...fourLegs(item, seatHeight, appearance.accent),
  ];
}

function sofaPrimitives(item: FurniturePlacement, palette: FurniturePalette): FurniturePrimitive[] {
  const appearance = getFurnitureAppearance(item, palette);
  return [
    box(0, 110, 0, item.width, 260, item.depth, appearance.accent),
    box(0, 350, -item.depth * 0.05, item.width * 0.82, 180, item.depth * 0.65, appearance.soft),
    box(0, 420, item.depth * 0.36, item.width * 0.82, item.height - 420, 190, appearance.primary),
    box(-item.width * 0.45, 280, 0, item.width * 0.1, 360, item.depth * 0.85, appearance.primary),
    box(item.width * 0.45, 280, 0, item.width * 0.1, 360, item.depth * 0.85, appearance.primary),
  ];
}

function bookshelfPrimitives(item: FurniturePlacement, palette: FurniturePalette): FurniturePrimitive[] {
  const appearance = getFurnitureAppearance(item, palette);
  const side = 45;
  const shelfCount = 5;
  const shelves = Array.from({ length: shelfCount }, (_, index) =>
    box(0, (item.height / (shelfCount - 1)) * index, 0, item.width - side * 2, 38, item.depth, appearance.primary),
  );
  return [
    box(-item.width / 2 + side / 2, 0, 0, side, item.height, item.depth, appearance.accent),
    box(item.width / 2 - side / 2, 0, 0, side, item.height, item.depth, appearance.accent),
    box(0, 0, item.depth / 2 - 18, item.width, item.height, 36, appearance.soft),
    ...shelves,
  ];
}

function kitchenRunPrimitives(item: FurniturePlacement, palette: FurniturePalette): FurniturePrimitive[] {
  const appearance = getFurnitureAppearance(item, palette);
  const isWallRun = item.kind === 'kitchen-wall-run';
  const counterHeight = isWallRun ? 0 : 48;
  const moduleCount = Math.max(2, Math.round(item.width / 600));
  const moduleWidth = item.width / moduleCount;
  const fronts = Array.from({ length: moduleCount }, (_, index) =>
    box(
      -item.width / 2 + moduleWidth * (index + 0.5),
      35,
      -item.depth / 2 - 12,
      moduleWidth - 18,
      item.height - 70,
      24,
      index % 2 === 0 ? appearance.primary : appearance.soft,
    ),
  );
  return [
    box(0, 0, 0, item.width, item.height, item.depth, appearance.accent),
    ...fronts,
    ...(counterHeight > 0 ? [box(0, item.height, 0, item.width + 55, counterHeight, item.depth + 55, '#D8D0C5')] : []),
  ];
}

function appliancePrimitives(item: FurniturePlacement, palette: FurniturePalette): FurniturePrimitive[] {
  const appearance = getFurnitureAppearance(item, palette);
  const frontZ = -item.depth / 2 - 12;
  if (item.kind === 'refrigerator') {
    return [
      box(0, 0, 0, item.width, item.height, item.depth, '#C9CED0'),
      box(0, item.height * 0.38, frontZ, item.width - 40, 24, 28, '#879095'),
      box(item.width * 0.32, item.height * 0.45, frontZ - 22, 26, item.height * 0.34, 32, appearance.accent),
    ];
  }
  const isDryer = item.kind === 'dryer';
  return [
    box(0, 0, 0, item.width, item.height, item.depth, isDryer ? '#D8D1C5' : '#E7E5DF'),
    box(0, item.height * 0.2, frontZ, item.width * 0.62, item.height * 0.56, 28, '#37434A'),
    box(0, item.height * 0.82, frontZ - 8, item.width * 0.82, item.height * 0.12, 26, '#A8B0B2'),
  ];
}

function bathroomPrimitives(item: FurniturePlacement, palette: FurniturePalette): FurniturePrimitive[] {
  const appearance = getFurnitureAppearance(item, palette);
  if (item.kind === 'vanity') {
    return [
      box(0, 0, 0, item.width, item.height, item.depth, appearance.primary),
      box(0, item.height, 0, item.width + 35, 50, item.depth + 35, '#E6E0D8'),
      box(0, item.height + 45, 0, item.width * 0.62, 45, item.depth * 0.65, '#C7D3D1'),
    ];
  }
  if (item.kind === 'toilet') {
    return [
      box(0, 0, item.depth * 0.27, item.width, item.height, item.depth * 0.38, '#ECE9E2'),
      box(0, 280, -item.depth * 0.12, item.width, 230, item.depth * 0.62, '#F5F2EC'),
      box(0, 500, -item.depth * 0.12, item.width * 0.92, 70, item.depth * 0.55, '#D9D5CE'),
    ];
  }
  if (item.kind === 'shower') {
    return [
      box(0, 0, 0, item.width, 70, item.depth, '#D6DDDC'),
      box(-item.width / 2 + 18, 70, 0, 36, item.height - 70, item.depth, '#9FC7CE'),
      box(0, 70, item.depth / 2 - 18, item.width, item.height - 70, 36, '#A9CDD2'),
      box(item.width / 2 - 25, 250, -item.depth / 2 + 50, 50, item.height - 250, 80, '#7E8C8B'),
    ];
  }
  return [
    box(0, 0, 0, item.width, 150, item.depth, '#E8E2DA'),
    box(-item.width / 2 + 55, 150, 0, 110, item.height - 150, item.depth, '#F3EFE8'),
    box(item.width / 2 - 55, 150, 0, 110, item.height - 150, item.depth, '#F3EFE8'),
    box(0, 150, -item.depth / 2 + 55, item.width - 220, item.height - 190, 110, '#F3EFE8'),
  ];
}

export function buildFurniturePrimitives(item: FurniturePlacement, palette: FurniturePalette): FurniturePrimitive[] {
  const appearance = getFurnitureAppearance(item, palette);
  switch (item.kind) {
    case 'single-bed':
    case 'double-bed':
      return bedPrimitives(item, palette);
    case 'nightstand':
      return [
        box(0, 40, 0, item.width, item.height - 40, item.depth, appearance.primary),
        box(0, item.height * 0.55, -item.depth / 2 - 10, item.width - 35, 30, 20, appearance.accent),
      ];
    case 'desk':
      return tablePrimitives(item, palette, item.height);
    case 'bookshelf':
      return bookshelfPrimitives(item, palette);
    case 'sofa':
      return sofaPrimitives(item, palette);
    case 'coffee-table':
    case 'dining-table':
      return tablePrimitives(item, palette, item.height);
    case 'rug':
      return [box(0, 2, 0, item.width, item.height, item.depth, appearance.soft)];
    case 'media-console':
      return [
        box(0, 90, 0, item.width, item.height - 90, item.depth, appearance.primary),
        box(0, item.height * 0.5, -item.depth / 2 - 10, item.width - 40, 24, 24, appearance.accent),
      ];
    case 'dining-chair':
      return chairPrimitives(item, palette);
    case 'plant':
      return [
        box(0, 0, 0, item.width * 0.55, 360, item.depth * 0.55, '#9B6847'),
        box(0, 340, 0, 65, item.height - 340, 65, '#6F5840'),
        box(-120, 520, 0, item.width * 0.55, 310, item.depth * 0.5, '#5E7C5F', 0.4),
        box(120, 690, 20, item.width * 0.55, 340, item.depth * 0.5, '#789274', -0.45),
      ];
    case 'kitchen-base-run':
    case 'kitchen-wall-run':
      return kitchenRunPrimitives(item, palette);
    case 'refrigerator':
    case 'washer':
    case 'dryer':
      return appliancePrimitives(item, palette);
    case 'oven':
      return [
        box(0, 0, 0, item.width, item.height, item.depth, appearance.accent),
        box(0, 180, -item.depth / 2 - 12, item.width - 55, 520, 28, '#22282B'),
        box(0, 735, -item.depth / 2 - 14, item.width - 55, 120, 30, '#81898B'),
      ];
    case 'sink':
      return [
        box(0, 0, 0, item.width, item.height, item.depth, '#B9C2C2'),
        box(0, item.height, 0, item.width * 0.7, 28, item.depth * 0.65, '#48585A'),
        box(item.width * 0.34, item.height, item.depth * 0.18, 45, 260, 45, '#8C9697'),
      ];
    case 'vanity':
    case 'toilet':
    case 'shower':
    case 'bathtub':
      return bathroomPrimitives(item, palette);
  }
}
