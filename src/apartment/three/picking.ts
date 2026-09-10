import type { CameraOrbit } from './renderer';
import type { ApartmentRoomScene } from './scene';

type Vec3 = readonly [number, number, number];
const subtract = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Trace the same perspective camera used by the renderer, including wall occlusion. */
export function pickSceneObject(
  scene: ApartmentRoomScene,
  camera: CameraOrbit,
  x: number,
  y: number,
  aspect: number,
): string | undefined {
  const inverse = ([rx, ry, rz]: Vec3): Vec3 => {
    const cy = ry * Math.cos(camera.pitch) + rz * Math.sin(camera.pitch);
    const cz = -ry * Math.sin(camera.pitch) + rz * Math.cos(camera.pitch);
    return [
      rx * Math.cos(camera.yaw) + cz * Math.sin(camera.yaw),
      cy,
      -rx * Math.sin(camera.yaw) + cz * Math.cos(camera.yaw),
    ];
  };
  const cameraOrigin = inverse([0, 0, -3.6 / camera.zoom]);
  const origin: Vec3 = [cameraOrigin[0], cameraOrigin[1] + scene.targetHeight, cameraOrigin[2]];
  const direction = inverse([(x * aspect) / 2.15, y / 2.15, 1]);
  let closest = Infinity;
  let selectedVertex = -1;
  const stride = scene.vertexStride;
  const vertex = (index: number): Vec3 => [scene.vertices[index], scene.vertices[index + 1], scene.vertices[index + 2]];
  for (let i = 0; i < scene.vertices.length; i += stride * 3) {
    const a = vertex(i),
      b = vertex(i + stride),
      c = vertex(i + stride * 2);
    const edge1 = subtract(b, a),
      edge2 = subtract(c, a);
    const h = cross(direction, edge2),
      determinant = dot(edge1, h);
    if (Math.abs(determinant) < 1e-9) continue;
    const s = subtract(origin, a),
      u = dot(s, h) / determinant;
    if (u < 0 || u > 1) continue;
    const q = cross(s, edge1),
      v = dot(direction, q) / determinant;
    if (v < 0 || u + v > 1) continue;
    const distance = dot(edge2, q) / determinant;
    if (distance >= 0.15 && distance < closest) {
      closest = distance;
      selectedVertex = i / stride;
    }
  }
  return scene.objects?.find(
    (object) => selectedVertex >= object.startVertex && selectedVertex < object.startVertex + object.vertexCount,
  )?.id;
}
