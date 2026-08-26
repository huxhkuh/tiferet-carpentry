import type { FurniturePlacement, Point } from '../types';

/**
 * Rotated-footprint technique adapted from Blueprint3D's MIT-licensed
 * `Item.getCorners()` implementation. The local implementation is rewritten
 * for immutable millimetre-domain data. See THIRD_PARTY_NOTICES.md.
 */
export function furnitureFootprint(placement: FurniturePlacement): Point[] {
  const halfWidth = placement.width / 2;
  const halfDepth = placement.depth / 2;
  const cosine = Math.cos(placement.rotation);
  const sine = Math.sin(placement.rotation);
  return [
    { x: -halfWidth, y: -halfDepth },
    { x: halfWidth, y: -halfDepth },
    { x: halfWidth, y: halfDepth },
    { x: -halfWidth, y: halfDepth },
  ].map((point) => ({
    x: placement.x + point.x * cosine - point.y * sine,
    y: placement.y + point.x * sine + point.y * cosine,
  }));
}
