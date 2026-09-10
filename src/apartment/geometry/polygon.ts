import type { Point } from '../types';

const EPSILON = 1e-7;
const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

function onSegment(point: Point, start: Point, end: Point, tolerance: number): boolean {
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  if (length < EPSILON) return Math.hypot(point.x - start.x, point.y - start.y) <= tolerance + EPSILON;
  return (
    Math.abs(cross(start, end, point)) <= (tolerance + EPSILON) * length &&
    point.x >= Math.min(start.x, end.x) - tolerance - EPSILON &&
    point.x <= Math.max(start.x, end.x) + tolerance + EPSILON &&
    point.y >= Math.min(start.y, end.y) - tolerance - EPSILON &&
    point.y <= Math.max(start.y, end.y) + tolerance + EPSILON
  );
}

function pointInsideOrOnPolygon(point: Point, polygon: readonly Point[], tolerance = 0): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j],
      b = polygon[i];
    if (onSegment(point, a, b, tolerance)) return true;
    if (a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x)
      inside = !inside;
  }
  return inside;
}

/** Split each edge at boundary intersections; every open subsegment must be inside. */
export function polygonContainsPolygon(boundary: readonly Point[], polygon: readonly Point[], tolerance = 0): boolean {
  if (polygon.length < 3 || !polygon.every((point) => pointInsideOrOnPolygon(point, boundary, tolerance))) return false;
  return polygon.every((a, i) => {
    const b = polygon[(i + 1) % polygon.length];
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const parameters = [0, 1];
    for (let j = 0; j < boundary.length; j++) {
      const c = boundary[j],
        d = boundary[(j + 1) % boundary.length];
      const ex = d.x - c.x,
        ey = d.y - c.y;
      const denominator = dx * ey - dy * ex;
      if (Math.abs(denominator) > EPSILON) {
        const t = ((c.x - a.x) * ey - (c.y - a.y) * ex) / denominator;
        const u = ((c.x - a.x) * dy - (c.y - a.y) * dx) / denominator;
        if (t > 0 && t < 1 && u >= -EPSILON && u <= 1 + EPSILON) parameters.push(t);
      } else if (Math.abs(cross(a, b, c)) <= EPSILON) {
        const lengthSquared = dx * dx + dy * dy;
        if (lengthSquared > EPSILON)
          for (const p of [c, d]) {
            const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared;
            if (t > 0 && t < 1) parameters.push(t);
          }
      }
    }
    parameters.sort((x, y) => x - y);
    return parameters.slice(1).every((end, j) => {
      const t = (parameters[j] + end) / 2;
      return pointInsideOrOnPolygon({ x: a.x + dx * t, y: a.y + dy * t }, boundary, tolerance);
    });
  });
}

/** Ear clipping for simple polygons; invalid/degenerate input produces no invented triangles. */
export function triangulatePolygon(polygon: readonly Point[]): Point[][] {
  const points = polygon.filter((point, i) => {
    const previous = polygon[(i + polygon.length - 1) % polygon.length];
    return Math.hypot(point.x - previous.x, point.y - previous.y) > EPSILON;
  });
  const area = points.reduce((sum, p, i) => {
    const q = points[(i + 1) % points.length];
    return sum + p.x * q.y - q.x * p.y;
  }, 0);
  if (Math.abs(area) < EPSILON) return [];
  if (area < 0) points.reverse();
  const triangles: Point[][] = [];
  while (points.length > 3) {
    const ear = points.findIndex((b, i) => {
      const a = points[(i + points.length - 1) % points.length],
        c = points[(i + 1) % points.length];
      if (cross(a, b, c) <= EPSILON) return false;
      return !points.some((p) => p !== a && p !== b && p !== c && pointInsideOrOnPolygon(p, [a, b, c]));
    });
    if (ear < 0) {
      const collinear = points.findIndex(
        (p, i) =>
          Math.abs(cross(points[(i + points.length - 1) % points.length], p, points[(i + 1) % points.length])) <
          EPSILON,
      );
      if (collinear < 0) return [];
      points.splice(collinear, 1);
      continue;
    }
    triangles.push([points[(ear + points.length - 1) % points.length], points[ear], points[(ear + 1) % points.length]]);
    points.splice(ear, 1);
  }
  if (points.length === 3) triangles.push([...points]);
  return triangles;
}

export function polygonsOverlap(first: readonly Point[], second: readonly Point[]): boolean {
  return triangulatePolygon(first).some((a) =>
    triangulatePolygon(second).some((b) => {
      return [a, b].every((triangle) =>
        triangle.every((p, i) => {
          const q = triangle[(i + 1) % 3];
          const axis = { x: p.y - q.y, y: q.x - p.x };
          const project = (points: readonly Point[]) => points.map((v) => v.x * axis.x + v.y * axis.y);
          const x = project(a),
            y = project(b);
          return Math.min(...x) < Math.max(...y) - EPSILON && Math.min(...y) < Math.max(...x) - EPSILON;
        }),
      );
    }),
  );
}

function clipHalfPlane(polygon: readonly Point[], a: Point, b: Point, inside: boolean): Point[] {
  const result: Point[] = [];
  const side = (point: Point) => cross(a, b, point) * (inside ? 1 : -1);
  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i],
      previous = polygon[(i + polygon.length - 1) % polygon.length];
    const currentDistance = side(current),
      previousDistance = side(previous);
    const currentInside = currentDistance >= -EPSILON,
      previousInside = previousDistance >= -EPSILON;
    if (currentInside !== previousInside) {
      const t = previousDistance / (previousDistance - currentDistance);
      result.push({ x: previous.x + t * (current.x - previous.x), y: previous.y + t * (current.y - previous.y) });
    }
    if (currentInside) result.push(current);
  }
  return result;
}

/** Subtract triangulated voids before tessellating a floor, including concave holes. */
export function triangulatePolygonWithHoles(
  boundary: readonly Point[],
  holes: readonly (readonly Point[])[],
): Point[][] {
  let pieces = triangulatePolygon(boundary);
  for (const hole of holes)
    for (const triangle of triangulatePolygon(hole)) {
      pieces = pieces.flatMap((piece) => {
        let remaining = piece;
        const outside: Point[][] = [];
        for (let edge = 0; edge < 3 && remaining.length >= 3; edge++) {
          const a = triangle[edge],
            b = triangle[(edge + 1) % 3];
          const fragment = clipHalfPlane(remaining, a, b, false);
          if (fragment.length >= 3) outside.push(fragment);
          remaining = clipHalfPlane(remaining, a, b, true);
        }
        return outside;
      });
    }
  return pieces.flatMap((piece) => triangulatePolygon(piece));
}
