import type { CabinetConfig, Part } from './types';
import { generateParts } from './parts';
import { computeDimensions } from './dimensions';
import { getMaterial } from './materials';
import { HINGE_ARM_CLEARANCE_MM, DRAWER_FRONT_EXTRA_HEIGHT_MM, DRAWER_FACE_GAP_MM } from './layout-constants';

/** Millimetres; X across, Y up, Z from the back towards the front. */
export interface PartInstance {
  id: string;
  part: Part;
  center: readonly [number, number, number];
  size: readonly [number, number, number];
}

export function buildPartInstances(config: CabinetConfig, parts: Part[] = generateParts(config)): PartInstance[] {
  const d = computeDimensions(config);
  const t = getMaterial(config.carcassMaterial, config.materialCatalog).thickness;
  const supports =
    config.furnitureType === 'desk' || config.furnitureType === 'panel'
      ? 0
      : Math.max(0, config.shelfCentreSupports ?? 0);
  const bays = supports + 1;
  const plinth =
    config.furnitureType === 'cabinet' || config.furnitureType === 'wardrobe' ? (config.kickHeight ?? 0) : 0;
  const bayWidth = (d.internalWidth - supports * t) / bays;
  const drawerCount =
    config.furnitureType === 'cabinet' || config.furnitureType === 'wardrobe' ? config.drawerCount : 0;
  const drawerHeights = Array.from({ length: drawerCount }, (_, i) => config.drawerHeights?.[i] ?? 150);
  const drawerStep = DRAWER_FRONT_EXTRA_HEIGHT_MM + DRAWER_FACE_GAP_MM;
  const drawerTop = plinth + t + drawerHeights.reduce((sum, height) => sum + height + drawerStep, 0);
  let fixedLevel = Math.max((config.height + plinth) / 2, drawerTop + t);
  const hasDoors =
    (config.furnitureType === 'cabinet' || config.furnitureType === 'wardrobe') &&
    config.doorStyle !== 'none' &&
    config.doorCount > 0;
  if (hasDoors) {
    const hingeLevels = d.hingePositions
      .map((position) => config.height - config.doorReveal - position)
      .sort((a, b) => a - b);
    for (const hinge of hingeLevels) {
      if (Math.abs(hinge - (fixedLevel + t / 2)) < HINGE_ARM_CLEARANCE_MM + t / 2)
        fixedLevel = hinge + HINGE_ARM_CLEARANCE_MM + 1;
    }
  }
  const shelfBottom = config.furnitureType === 'desk' ? t : Math.max(plinth + t, drawerTop);
  const shelfPositions = Array.from({ length: config.shelfCount }, (_, i) => {
    const requested = config.shelfSpacing === 'custom' ? config.customShelfPositions[i] : undefined;
    const level =
      requested === undefined
        ? shelfBottom + ((config.height - t - shelfBottom) * (i + 1)) / (config.shelfCount + 1)
        : plinth + t + requested;
    return requested === undefined && config.height > 1200 && Math.abs(level - fixedLevel) < t + 2
      ? fixedLevel + t + 2
      : level;
  });
  const instances: PartInstance[] = [];
  for (const part of parts) {
    for (let i = 0; i < part.qty; i++) {
      const name = part.name.en,
        thickness = part.thickness;
      const bay = i % bays,
        bayX = t + bay * (bayWidth + t) + bayWidth / 2;
      let center: [number, number, number];
      let size: [number, number, number] = [part.length, part.width, thickness];
      if (name === 'Panel') {
        center = [part.length / 2, part.width / 2, thickness / 2];
      } else if (name === 'Side Panel') {
        size = [thickness, part.length, part.width];
        center = [i === 0 ? thickness / 2 : config.width - thickness / 2, plinth + part.length / 2, config.depth / 2];
      } else if (name === 'Desktop' || name === 'Top Panel' || name === 'Bottom Panel') {
        size = [part.length, thickness, part.width];
        center = [
          config.width / 2,
          name === 'Bottom Panel' ? plinth + thickness / 2 : config.height - thickness / 2,
          config.depth / 2,
        ];
      } else if (name === 'Centre Support') {
        size = [thickness, part.length, part.width];
        center = [t + (i + 1) * bayWidth + i * t + thickness / 2, plinth + t + part.length / 2, part.width / 2];
      } else if (name.includes('Shelf')) {
        size = [part.length, thickness, part.width];
        center = [
          bayX,
          (name === 'Fixed Shelf' ? fixedLevel : (shelfPositions[Math.floor(i / bays)] ?? shelfBottom)) + thickness / 2,
          part.width / 2 + (name === 'Under-desk Shelf' ? t : 0),
        ];
      } else if (name === 'Back Panel') {
        size = [part.width, part.length, thickness];
        center = [config.width / 2, (config.height + plinth) / 2, -thickness / 2];
      } else if (name === 'Modesty Panel') {
        center = [config.width / 2, config.height - t - part.width / 2, thickness / 2];
      } else if (name === 'Door' || name === 'Glass Door') {
        size = [part.width, part.length, thickness];
        center = [
          config.doorReveal + part.width / 2 + i * (part.width + Math.max(0, config.doorReveal - 1)),
          (config.height + plinth) / 2,
          config.depth + thickness / 2,
        ];
      } else if (name === 'Toe Kick (Front)') {
        center = [config.width / 2, part.width / 2, config.depth - thickness / 2];
      } else if (name === 'Toe Kick (Side)') {
        size = [thickness, part.width, part.length];
        center = [i === 0 ? thickness / 2 : config.width - thickness / 2, part.width / 2, part.length / 2];
      } else {
        const drawer = /^Drawer (\d+) (.+)$/.exec(name);
        if (!drawer) throw new TypeError(`No assembled placement is defined for part ${part.id}: ${name}`);
        const index = Number(drawer[1]) - 1;
        const bottom = plinth + t + drawerHeights.slice(0, index).reduce((sum, height) => sum + height + drawerStep, 0);
        const drawerWidth = bayWidth - 26;
        const drawerDepth = Math.min(config.depth - t - 30, 500);
        const frontZ = config.depth - t;
        if (drawer[2] === 'Front') {
          size = [part.width, part.length, thickness];
          center = [bayX, bottom + part.length / 2, frontZ + thickness / 2];
        } else if (drawer[2] === 'Box Side') {
          const drawerBay = Math.floor(i / 2);
          size = [thickness, part.width, part.length];
          center = [
            t + drawerBay * (bayWidth + t) + bayWidth / 2 + ((i % 2 === 0 ? -1 : 1) * (drawerWidth - thickness)) / 2,
            bottom + 15 + part.width / 2,
            frontZ - drawerDepth / 2,
          ];
        } else if (drawer[2] === 'Box End') {
          const drawerBay = Math.floor(i / 2);
          size = [part.length, part.width, thickness];
          center = [
            t + drawerBay * (bayWidth + t) + bayWidth / 2,
            bottom + 15 + part.width / 2,
            i % 2 === 0 ? frontZ - thickness / 2 : frontZ - drawerDepth + thickness / 2,
          ];
        } else {
          size = [part.width, thickness, part.length];
          center = [bayX, bottom + 15 - thickness / 2, frontZ - drawerDepth / 2];
        }
      }
      instances.push({ id: `${part.id}-${i + 1}`, part, center, size });
    }
  }
  return instances;
}
