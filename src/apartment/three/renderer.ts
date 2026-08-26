import type { ApartmentRoomScene } from './scene';

export interface CameraOrbit {
  yaw: number;
  pitch: number;
  zoom: number;
}

export interface SceneRenderHandle {
  dispose: () => void;
}

const VERTEX_SHADER = `
  attribute vec3 aPosition;
  attribute vec3 aNormal;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying vec3 vNormal;
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
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  varying vec3 vColor;
  varying vec3 vNormal;

  void main() {
    vec3 lightDirection = normalize(vec3(-0.45, 0.82, 0.38));
    float diffuse = max(dot(normalize(vNormal), lightDirection), 0.0);
    float wrapLight = 0.58 + diffuse * 0.42;
    vec3 litColor = vColor * wrapLight + vec3(0.035, 0.03, 0.025);
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

export function renderApartmentRoomScene(
  gl: WebGLRenderingContext,
  scene: ApartmentRoomScene,
  camera: CameraOrbit,
  width: number,
  height: number,
): SceneRenderHandle | null {
  const program = createProgram(gl);
  const buffer = gl.createBuffer();
  if (!program || !buffer) {
    if (program) gl.deleteProgram(program);
    if (buffer) gl.deleteBuffer(buffer);
    return null;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, scene.vertices, gl.STATIC_DRAW);
  gl.useProgram(program);

  const stride = 9 * Float32Array.BYTES_PER_ELEMENT;
  const positionLocation = gl.getAttribLocation(program, 'aPosition');
  const normalLocation = gl.getAttribLocation(program, 'aNormal');
  const colorLocation = gl.getAttribLocation(program, 'aColor');
  if (positionLocation >= 0) {
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, stride, 0);
  }
  if (normalLocation >= 0) {
    gl.enableVertexAttribArray(normalLocation);
    gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
  }
  if (colorLocation >= 0) {
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, stride, 6 * Float32Array.BYTES_PER_ELEMENT);
  }

  gl.uniform1f(gl.getUniformLocation(program, 'uAspect'), width / Math.max(1, height));
  gl.uniform1f(gl.getUniformLocation(program, 'uYaw'), camera.yaw);
  gl.uniform1f(gl.getUniformLocation(program, 'uPitch'), camera.pitch);
  gl.uniform1f(gl.getUniformLocation(program, 'uZoom'), camera.zoom);
  gl.uniform1f(gl.getUniformLocation(program, 'uTargetHeight'), scene.targetHeight);
  gl.viewport(0, 0, width, height);
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.91, 0.9, 0.87, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, scene.vertices.length / 9);

  return {
    dispose: () => {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
