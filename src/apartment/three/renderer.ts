import type { ApartmentRoomScene } from './scene';

export interface CameraOrbit {
  yaw: number;
  pitch: number;
  zoom: number;
}

interface SceneRenderHandle {
  dispose: () => void;
}

export interface ApartmentRoomRenderer extends SceneRenderHandle {
  setScene: (scene: ApartmentRoomScene) => void;
  draw: (camera: CameraOrbit, width: number, height: number) => void;
}

interface AttributeLocations {
  position: number;
  normal: number;
  color: number;
  material: number;
}

interface UniformLocations {
  aspect: WebGLUniformLocation | null;
  yaw: WebGLUniformLocation | null;
  pitch: WebGLUniformLocation | null;
  zoom: WebGLUniformLocation | null;
  targetHeight: WebGLUniformLocation | null;
  millimetresPerUnit: WebGLUniformLocation | null;
}

const VERTEX_SHADER = `
  attribute vec3 aPosition;
  attribute vec3 aNormal;
  attribute vec3 aColor;
  attribute float aMaterial;
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vMaterial;
  uniform float uAspect;
  uniform float uYaw;
  uniform float uPitch;
  uniform float uZoom;
  uniform float uTargetHeight;

  void main() {
    float yawCos = cos(uYaw);
    float yawSin = sin(uYaw);
    float rotatedX = aPosition.x * yawCos - aPosition.z * yawSin;
    float rotatedZ = aPosition.x * yawSin + aPosition.z * yawCos;
    float normalX = aNormal.x * yawCos - aNormal.z * yawSin;
    float normalZ = aNormal.x * yawSin + aNormal.z * yawCos;
    float pitchCos = cos(uPitch);
    float pitchSin = sin(uPitch);
    float centeredY = aPosition.y - uTargetHeight;
    float rotatedY = centeredY * pitchCos - rotatedZ * pitchSin;
    float cameraZ = centeredY * pitchSin + rotatedZ * pitchCos + 3.6 / uZoom;
    float normalY = aNormal.y * pitchCos - normalZ * pitchSin;
    float pitchedNormalZ = aNormal.y * pitchSin + normalZ * pitchCos;
    float perspective = 2.15;
    float normalizedDepth = ((cameraZ - 0.15) / 7.85) * 2.0 - 1.0;
    gl_Position = vec4(
      rotatedX * perspective / uAspect,
      rotatedY * perspective,
      normalizedDepth * cameraZ,
      cameraZ
    );
    vColor = aColor;
    vNormal = normalize(vec3(normalX, normalY, pitchedNormalZ));
    vPosition = aPosition;
    vMaterial = aMaterial;
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vMaterial;

  uniform float uMillimetresPerUnit;
  float isMaterial(float id) {
    return 1.0 - step(0.25, abs(vMaterial - id));
  }

  void main() {
    vec3 lightDirection = normalize(vec3(-0.45, 0.82, 0.38));
    float diffuse = max(dot(normalize(vNormal), lightDirection), 0.0);
    float wrapLight = 0.56 + diffuse * 0.44;
    float wood = isMaterial(2.0);
    float metal = isMaterial(3.0);
    float glass = isMaterial(4.0);
    float fabric = isMaterial(5.0);
    float ceramic = isMaterial(6.0);
    float shadow = isMaterial(7.0);
    float floorMaterial = isMaterial(0.0);
    vec3 positionMm = vPosition * uMillimetresPerUnit;
    float grain = sin((positionMm.x + positionMm.z * 0.1) * 0.18);
    float floorGrid = step(0.985, max(abs(fract(positionMm.x / 600.0) - 0.5), abs(fract(positionMm.z / 600.0) - 0.5)) * 2.0);
    float fabricWeave = sin(positionMm.x * 0.35) * sin(positionMm.z * 0.35);
    vec3 materialColor = vColor;
    materialColor *= 1.0 + wood * grain * 0.035;
    materialColor *= 1.0 + fabric * fabricWeave * 0.018;
    materialColor *= 1.0 - floorMaterial * floorGrid * 0.08;
    float gloss = mix(12.0, 64.0, min(1.0, metal + glass));
    float specular = pow(max(dot(normalize(vNormal), normalize(vec3(-0.25, 0.68, 0.55))), 0.0), gloss);
    float specularStrength = metal * 0.18 + glass * 0.16 + ceramic * 0.08;
    vec3 litColor = materialColor * wrapLight + vec3(0.035, 0.03, 0.025) + specular * specularStrength;
    litColor = mix(litColor, vColor * 0.5, shadow);
    gl_FragColor = vec4(min(litColor, vec3(1.0)), mix(1.0, 0.32, glass));
  }
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vertexShader || !fragmentShader) {
    if (vertexShader) gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
    return null;
  }
  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return null;
  }
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function configureAttribute(
  gl: WebGLRenderingContext,
  location: number,
  size: number,
  stride: number,
  offset: number,
): void {
  if (location < 0) return;
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset);
}

export function createApartmentRoomRenderer(gl: WebGLRenderingContext): ApartmentRoomRenderer | null {
  const program = createProgram(gl);
  const buffer = gl.createBuffer();
  if (!program || !buffer) {
    if (program) gl.deleteProgram(program);
    if (buffer) gl.deleteBuffer(buffer);
    return null;
  }
  const attributes: AttributeLocations = {
    position: gl.getAttribLocation(program, 'aPosition'),
    normal: gl.getAttribLocation(program, 'aNormal'),
    color: gl.getAttribLocation(program, 'aColor'),
    material: gl.getAttribLocation(program, 'aMaterial'),
  };
  const uniforms: UniformLocations = {
    aspect: gl.getUniformLocation(program, 'uAspect'),
    yaw: gl.getUniformLocation(program, 'uYaw'),
    pitch: gl.getUniformLocation(program, 'uPitch'),
    zoom: gl.getUniformLocation(program, 'uZoom'),
    targetHeight: gl.getUniformLocation(program, 'uTargetHeight'),
    millimetresPerUnit: gl.getUniformLocation(program, 'uMillimetresPerUnit'),
  };
  let scene: ApartmentRoomScene | null = null;
  let vertexCount = 0;
  let opaqueRanges: { start: number; count: number }[] = [];
  let transparentTriangles: { start: number; x: number; y: number; z: number }[] = [];

  return {
    setScene: (nextScene: ApartmentRoomScene) => {
      if (scene === nextScene) return;
      scene = nextScene;
      vertexCount = nextScene.vertices.length / nextScene.vertexStride;
      opaqueRanges = [];
      transparentTriangles = [];
      for (let vertex = 0; vertex < vertexCount; vertex += 3) {
        const offset = vertex * nextScene.vertexStride;
        if (Math.abs(nextScene.vertices[offset + 9] - 4) < 0.25) {
          const center = [0, 1, 2].map(
            (axis) =>
              [0, 1, 2].reduce(
                (sum, point) => sum + nextScene.vertices[offset + point * nextScene.vertexStride + axis],
                0,
              ) / 3,
          );
          transparentTriangles.push({ start: vertex, x: center[0], y: center[1], z: center[2] });
        } else {
          const previous = opaqueRanges.at(-1);
          if (previous && previous.start + previous.count === vertex) previous.count += 3;
          else opaqueRanges.push({ start: vertex, count: 3 });
        }
      }
      const stride = nextScene.vertexStride * Float32Array.BYTES_PER_ELEMENT;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, nextScene.vertices, gl.STATIC_DRAW);
      gl.useProgram(program);
      configureAttribute(gl, attributes.position, 3, stride, 0);
      configureAttribute(gl, attributes.normal, 3, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
      configureAttribute(gl, attributes.color, 3, stride, 6 * Float32Array.BYTES_PER_ELEMENT);
      configureAttribute(gl, attributes.material, 1, stride, 9 * Float32Array.BYTES_PER_ELEMENT);
    },
    draw: (camera: CameraOrbit, width: number, height: number) => {
      if (!scene) return;
      gl.useProgram(program);
      gl.uniform1f(uniforms.aspect, width / Math.max(1, height));
      gl.uniform1f(uniforms.yaw, camera.yaw);
      gl.uniform1f(uniforms.pitch, camera.pitch);
      gl.uniform1f(uniforms.zoom, camera.zoom);
      gl.uniform1f(uniforms.targetHeight, scene.targetHeight);
      gl.uniform1f(uniforms.millimetresPerUnit, scene.millimetresPerUnit ?? 1000);
      gl.viewport(0, 0, width, height);
      gl.enable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.depthMask(true);
      gl.clearColor(0.91, 0.9, 0.87, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      for (const range of opaqueRanges) gl.drawArrays(gl.TRIANGLES, range.start, range.count);
      if (transparentTriangles.length) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        const targetHeight = scene.targetHeight;
        const depth = (triangle: (typeof transparentTriangles)[number]) =>
          (triangle.y - targetHeight) * Math.sin(camera.pitch) +
          (triangle.x * Math.sin(camera.yaw) + triangle.z * Math.cos(camera.yaw)) * Math.cos(camera.pitch);
        const ordered = [...transparentTriangles].sort((a, b) => depth(b) - depth(a));
        for (const triangle of ordered) gl.drawArrays(gl.TRIANGLES, triangle.start, 3);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
      }
    },
    dispose: () => {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
