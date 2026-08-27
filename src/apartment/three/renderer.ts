import type { ApartmentRoomScene } from './scene';

export interface CameraOrbit {
  yaw: number;
  pitch: number;
  zoom: number;
}

export interface SceneRenderHandle {
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
    float grain = sin((vPosition.x * 23.0 + vPosition.z * 37.0) * 3.14159265);
    float floorGrid = step(0.985, max(abs(fract(vPosition.x * 7.0) - 0.5), abs(fract(vPosition.z * 7.0) - 0.5)) * 2.0);
    float fabricWeave = sin(vPosition.x * 95.0) * sin(vPosition.z * 95.0);
    vec3 materialColor = vColor;
    materialColor *= 1.0 + wood * grain * 0.035;
    materialColor *= 1.0 + fabric * fabricWeave * 0.018;
    materialColor *= 1.0 - floorMaterial * floorGrid * 0.08;
    float specular = pow(max(dot(normalize(vNormal), normalize(vec3(-0.25, 0.68, 0.55))), 0.0), 28.0);
    float specularStrength = metal * 0.18 + glass * 0.16 + ceramic * 0.08;
    vec3 litColor = materialColor * wrapLight + vec3(0.035, 0.03, 0.025) + specular * specularStrength;
    litColor = mix(litColor, vColor * 0.5, shadow);
    gl_FragColor = vec4(min(litColor, vec3(1.0)), 1.0);
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
  if (!vertexShader || !fragmentShader) return null;
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
  };
  let scene: ApartmentRoomScene | null = null;
  let vertexCount = 0;

  return {
    setScene: (nextScene: ApartmentRoomScene) => {
      if (scene === nextScene) return;
      scene = nextScene;
      vertexCount = nextScene.vertices.length / nextScene.vertexStride;
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
      gl.viewport(0, 0, width, height);
      gl.enable(gl.DEPTH_TEST);
      gl.clearColor(0.91, 0.9, 0.87, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
    },
    dispose: () => {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}

export function renderApartmentRoomScene(
  gl: WebGLRenderingContext,
  scene: ApartmentRoomScene,
  camera: CameraOrbit,
  width: number,
  height: number,
): SceneRenderHandle | null {
  const renderer = createApartmentRoomRenderer(gl);
  if (!renderer) return null;
  renderer.setScene(scene);
  renderer.draw(camera, width, height);
  return renderer;
}
