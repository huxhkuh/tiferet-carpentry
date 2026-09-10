import { buildPartInstances } from '../../engine/part-instances';
import type { CabinetPlacement, Point, Room, Wall } from '../types';
import { wallFrame } from './wall-frame';

export interface OpeningEnvelope {
  polygon: Point[];
  elevation: number;
  height: number;
  kind: 'door' | 'drawer';
}

/**
 * Preliminary 90-degree door sweep and full drawer-box travel, using assembled
 * fronts and their actual vertical intervals. Hinges alternate left/right;
 * isMirrored swaps them. Hardware opening angles/travel still need verification.
 */
export function cabinetOpeningEnvelopes(cabinet: CabinetPlacement, wall: Wall, room: Room): OpeningEnvelope[] {
  const frame = wallFrame(wall, room);
  const world = (x: number, depth: number): Point => ({
    x: frame.origin.x + frame.tangent.x * (cabinet.distanceFromWallStart + x) + frame.inwardNormal.x * depth,
    y: frame.origin.y + frame.tangent.y * (cabinet.distanceFromWallStart + x) + frame.inwardNormal.y * depth,
  });
  const instances = buildPartInstances(cabinet.cabinetConfig);
  const result: OpeningEnvelope[] = [];
  let doorIndex = 0;
  for (const instance of instances) {
    const name = instance.part.name.en;
    const [x, y, z] = instance.center;
    const [width, height, thickness] = instance.size;
    const front = z + thickness / 2;
    const elevation = cabinet.elevation + y - height / 2;
    if (name === 'Door' || name === 'Glass Door') {
      const rightHinge = (doorIndex++ % 2 === 1) !== !!cabinet.cabinetConfig.isMirrored;
      const sign = rightHinge ? -1 : 1;
      const hinge = x - (sign * width) / 2;
      const radius = width + thickness;
      const step = Math.PI / 36;
      // Tangent intersections enclose the arc instead of cutting inside it.
      const polygon = [world(hinge, front), world(hinge + sign * radius, front)];
      for (let index = 0; index < 18; index++) {
        const angle = (index + 0.5) * step;
        const outerRadius = radius / Math.cos(step / 2);
        polygon.push(world(hinge + sign * outerRadius * Math.cos(angle), front + outerRadius * Math.sin(angle)));
      }
      polygon.push(world(hinge, front + radius));
      result.push({ kind: 'door', polygon, elevation, height });
    } else {
      const match = /^Drawer (\d+) Front$/.exec(name);
      if (!match) continue;
      const side = instances.find((item) => item.part.name.en === `Drawer ${match[1]} Box Side`);
      if (!side) continue;
      const travel = side.size[2];
      result.push({
        kind: 'drawer',
        elevation,
        height,
        polygon: [
          world(x - width / 2, front),
          world(x + width / 2, front),
          world(x + width / 2, front + travel),
          world(x - width / 2, front + travel),
        ],
      });
    }
  }
  return result;
}
