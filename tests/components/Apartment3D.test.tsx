import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Room3D } from '../../src/apartment/components/Room3D';
import { TIFERET_5_1 } from '../../src/apartment/data/tiferet';
import { buildApartmentRoomScene } from '../../src/apartment/three/scene';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import type { CabinetPlacement } from '../../src/apartment/types';

function createWebGLFixture() {
  const drawArrays = vi.fn();
  const bufferData = vi.fn();
  const context = {
    VERTEX_SHADER: 35_633,
    FRAGMENT_SHADER: 35_632,
    COMPILE_STATUS: 35_713,
    LINK_STATUS: 35_714,
    ARRAY_BUFFER: 34_962,
    STATIC_DRAW: 35_044,
    FLOAT: 5_126,
    DEPTH_TEST: 2_929,
    CULL_FACE: 2_884,
    COLOR_BUFFER_BIT: 16_384,
    DEPTH_BUFFER_BIT: 256,
    TRIANGLES: 4,
    createShader: vi.fn(() => ({ kind: 'shader' })),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => ({ kind: 'program' })),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    deleteProgram: vi.fn(),
    createBuffer: vi.fn(() => ({ kind: 'buffer' })),
    bindBuffer: vi.fn(),
    bufferData,
    getAttribLocation: vi.fn((_program: WebGLProgram, name: string) => {
      if (name === 'aPosition') return 0;
      if (name === 'aNormal') return 1;
      return 2;
    }),
    getUniformLocation: vi.fn(() => ({ kind: 'uniform' })),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    useProgram: vi.fn(),
    uniform1f: vi.fn(),
    enable: vi.fn(),
    viewport: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    drawArrays,
    deleteBuffer: vi.fn(),
  } as unknown as WebGLRenderingContext;
  return { context, drawArrays, bufferData };
}

const BEDROOM_PLACEMENT: CabinetPlacement = {
  id: 'cabinet-bedroom-1',
  apartmentId: TIFERET_5_1.id,
  roomId: 'bedroom',
  wallId: 'bed-e',
  distanceFromWallStart: 400,
  elevation: 0,
  orientation: Math.PI,
  width: 1_800,
  height: 2_400,
  depth: 600,
  cabinetConfig: {
    ...DEFAULT_CONFIG,
    furnitureType: 'wardrobe',
    width: 1_800,
    height: 2_400,
    depth: 600,
    doorCount: 2,
  },
};

describe('Room3D', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('מציג חלופה נגישה כאשר WebGL אינו זמין', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    render(<Room3D apartment={TIFERET_5_1} roomId="bedroom" placements={[]} />);

    expect(screen.getByTestId('apartment-3d-fallback')).toHaveTextContent('הדמיית התלת־ממד אינה זמינה');
  });

  it('מרנדר את רצפת החדר, קירותיו והארון באמצעות WebGL', () => {
    const fixture = createWebGLFixture();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fixture.context);

    render(<Room3D apartment={TIFERET_5_1} roomId="bedroom" placements={[BEDROOM_PLACEMENT]} />);

    const canvas = screen.getByTestId('apartment-3d-canvas');
    expect(canvas).toHaveAttribute('data-scene-walls', '4');
    expect(canvas).toHaveAttribute('data-scene-cutaway-walls', '2');
    expect(canvas).toHaveAttribute('data-scene-cabinets', '1');
    expect(canvas).toHaveAttribute('data-camera-yaw', '2.62');
    expect(canvas).toHaveAttribute('data-camera-zoom', '0.78');
    expect(fixture.bufferData).toHaveBeenCalledWith(
      fixture.context.ARRAY_BUFFER,
      expect.any(Float32Array),
      fixture.context.STATIC_DRAW,
    );
    const uploadedGeometry = fixture.bufferData.mock.calls[0]?.[1];
    expect(uploadedGeometry).toBeInstanceOf(Float32Array);
    if (!(uploadedGeometry instanceof Float32Array)) throw new TypeError('Expected WebGL geometry');
    const verticalCoordinates = Array.from(uploadedGeometry.filter((_, index) => index % 9 === 1));
    const depthCoordinates = Array.from(uploadedGeometry.filter((_, index) => index % 9 === 2));
    expect(verticalCoordinates.some((value) => value > 0.5)).toBe(true);
    expect(depthCoordinates.some((value) => Math.abs(value) > 0.5)).toBe(true);
    expect(fixture.drawArrays).toHaveBeenCalled();
  });

  it('מציג בחדר השינה שתי מיטות יחיד נפרדות כחלק מהדמיית הריהוט', () => {
    const fixture = createWebGLFixture();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fixture.context);

    render(<Room3D apartment={TIFERET_5_1} roomId="bedroom" placements={[]} />);

    const canvas = screen.getByTestId('apartment-3d-canvas');
    expect(canvas).toHaveAttribute('data-scene-beds', '2');
    expect(canvas).toHaveAttribute('data-scene-furniture');
    expect(canvas).toHaveAccessibleName(/שתי מיטות יחיד נפרדות/);
  });

  it('מייצר גאומטריה שונה לדלת פתוחה, דלת חלקה ודלת מסגרת', () => {
    const room = TIFERET_5_1.rooms.find((candidate) => candidate.id === 'bedroom');
    if (!room) throw new Error('Missing bedroom fixture');
    const placementWithStyle = (doorStyle: 'flat' | 'shaker' | 'none'): CabinetPlacement => ({
      ...BEDROOM_PLACEMENT,
      cabinetConfig: { ...BEDROOM_PLACEMENT.cabinetConfig, doorStyle },
    });

    const openScene = buildApartmentRoomScene(TIFERET_5_1, room, [placementWithStyle('none')]);
    const flatScene = buildApartmentRoomScene(TIFERET_5_1, room, [placementWithStyle('flat')]);
    const shakerScene = buildApartmentRoomScene(TIFERET_5_1, room, [placementWithStyle('shaker')]);

    expect(openScene.vertices.length).toBeLessThan(flatScene.vertices.length);
    expect(flatScene.vertices.length).toBeLessThan(shakerScene.vertices.length);
  });

  it('מאפשר להטות את המצלמה באמצעות בקרה נגישה', () => {
    const fixture = createWebGLFixture();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fixture.context);
    render(<Room3D apartment={TIFERET_5_1} roomId="bedroom" placements={[]} />);
    const canvas = screen.getByTestId('apartment-3d-canvas');
    expect(canvas).toHaveAttribute('data-camera-pitch', '-0.52');
    expect(screen.getByRole('toolbar', { name: 'בקרי מצלמה תלת־ממדית' })).toHaveClass('inset-x-0', 'w-fit');

    fireEvent.click(screen.getByRole('button', { name: 'הטה מעלה' }));

    expect(canvas).toHaveAttribute('data-camera-pitch', '-0.64');
  });

  it('מתאר לקורא מסך את מידות הארון המוצג', () => {
    const fixture = createWebGLFixture();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fixture.context);

    render(<Room3D apartment={TIFERET_5_1} roomId="bedroom" placements={[BEDROOM_PLACEMENT]} />);

    expect(screen.getByText(/ארון ברוחב 180 ס״מ, גובה 240 ס״מ ועומק 60 ס״מ/)).toBeInTheDocument();
  });

  it('מעדכן מיד את תיאור התלת־ממד כאשר רוחב הארון משתנה', () => {
    const fixture = createWebGLFixture();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fixture.context);
    const { rerender } = render(<Room3D apartment={TIFERET_5_1} roomId="bedroom" placements={[BEDROOM_PLACEMENT]} />);
    expect(screen.getByTestId('apartment-3d-canvas')).toHaveAccessibleName(/ארון 180×240×60 ס״מ/);

    const widerPlacement: CabinetPlacement = {
      ...BEDROOM_PLACEMENT,
      width: 2_200,
      cabinetConfig: { ...BEDROOM_PLACEMENT.cabinetConfig, width: 2_200 },
    };
    rerender(<Room3D apartment={TIFERET_5_1} roomId="bedroom" placements={[widerPlacement]} />);

    expect(screen.getByTestId('apartment-3d-canvas')).toHaveAccessibleName(/ארון 220×240×60 ס״מ/);
    expect(fixture.bufferData).toHaveBeenCalledTimes(2);
  });

  it('פותח את חדר הארון השמור כאשר עוברים ל־3D בלי לבחור חדר מחדש', () => {
    const fixture = createWebGLFixture();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fixture.context);

    render(<Room3D apartment={TIFERET_5_1} roomId={null} placements={[BEDROOM_PLACEMENT]} />);

    const canvas = screen.getByTestId('apartment-3d-canvas');
    expect(canvas).toHaveAccessibleName(/עבור חדר שינה/);
    expect(canvas).toHaveAttribute('data-scene-cabinets', '1');
  });
});
