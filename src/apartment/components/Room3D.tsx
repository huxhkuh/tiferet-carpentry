import { useEffect, useMemo, useRef, useState } from 'react';
import { renderApartmentRoomScene, type CameraOrbit } from '../three/renderer';
import { buildApartmentRoomScene, DEFAULT_ROOM_CAMERA_YAW } from '../three/scene';
import type { Apartment, CabinetPlacement, FurniturePalette } from '../types';

type RendererStatus = 'checking' | 'ready' | 'unavailable';

interface Room3DProps {
  apartment: Apartment;
  roomId: string | null;
  placements: CabinetPlacement[];
  showFurniture?: boolean;
  furniturePalette?: FurniturePalette;
}

interface DragOrigin {
  x: number;
  y: number;
  yaw: number;
  pitch: number;
}

const INITIAL_CAMERA: CameraOrbit = { yaw: DEFAULT_ROOM_CAMERA_YAW, pitch: -0.52, zoom: 0.78 };

const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value));

function cameraAfterKey(camera: CameraOrbit, key: string): CameraOrbit {
  if (key === 'ArrowLeft') return { ...camera, yaw: camera.yaw - 0.16 };
  if (key === 'ArrowRight') return { ...camera, yaw: camera.yaw + 0.16 };
  if (key === 'ArrowUp') return { ...camera, pitch: clamp(camera.pitch - 0.1, -1.25, -0.14) };
  if (key === 'ArrowDown') return { ...camera, pitch: clamp(camera.pitch + 0.1, -1.25, -0.14) };
  if (key === '+' || key === '=') return { ...camera, zoom: clamp(camera.zoom * 1.12, 0.55, 2.2) };
  if (key === '-') return { ...camera, zoom: clamp(camera.zoom / 1.12, 0.55, 2.2) };
  if (key === 'Home') return { ...INITIAL_CAMERA };
  return camera;
}

export function Room3D({
  apartment,
  roomId,
  placements,
  showFurniture = true,
  furniturePalette = 'warm',
}: Room3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragOriginRef = useRef<DragOrigin | null>(null);
  const [rendererStatus, setRendererStatus] = useState<RendererStatus>('checking');
  const [camera, setCamera] = useState<CameraOrbit>({ ...INITIAL_CAMERA });
  const room =
    apartment.rooms.find((item) => item.id === roomId) ??
    apartment.rooms.find((item) => item.id === placements[0]?.roomId) ??
    apartment.rooms[0];
  const roomPlacements = useMemo(
    () => placements.filter((placement) => placement.roomId === room.id),
    [placements, room.id],
  );
  const roomFurniture = useMemo(
    () => (showFurniture ? (apartment.furniture ?? []).filter((item) => item.roomId === room.id) : []),
    [apartment.furniture, room.id, showFurniture],
  );
  const scene = useMemo(
    () => buildApartmentRoomScene(apartment, room, roomPlacements, { showFurniture, furniturePalette }),
    [apartment, furniturePalette, room, roomPlacements, showFurniture],
  );
  const cabinetSummary = useMemo(
    () =>
      roomPlacements.length === 0
        ? 'ללא ארונות'
        : roomPlacements
            .map(
              (placement) =>
                `ארון ${Math.round(placement.width / 10)}×${Math.round(placement.height / 10)}×${Math.round(placement.depth / 10)} ס״מ`,
            )
            .join(', '),
    [roomPlacements],
  );
  const singleBedCount = roomFurniture.filter((item) => item.kind === 'single-bed').length;
  const furnitureSummary =
    singleBedCount === 2
      ? `שתי מיטות יחיד נפרדות ועוד ${Math.max(0, roomFurniture.length - 2)} פריטי ריהוט`
      : roomFurniture.length === 0
        ? 'ללא ריהוט קבוע'
        : `${roomFurniture.length} פריטי ריהוט`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: true,
      depth: true,
      powerPreference: 'high-performance',
    });
    if (!gl) {
      setRendererStatus('unavailable');
      return;
    }

    let handle: ReturnType<typeof renderApartmentRoomScene> = null;
    const draw = () => {
      handle?.dispose();
      const pixelRatio = clamp(window.devicePixelRatio || 1, 1, 2);
      const width = Math.max(1, Math.round((canvas.clientWidth || 960) * pixelRatio));
      const height = Math.max(1, Math.round((canvas.clientHeight || 540) * pixelRatio));
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      handle = renderApartmentRoomScene(gl, scene, camera, width, height);
      setRendererStatus(handle ? 'ready' : 'unavailable');
    };
    draw();
    window.addEventListener('resize', draw);
    return () => {
      window.removeEventListener('resize', draw);
      handle?.dispose();
    };
  }, [camera, scene]);

  const changeZoom = (factor: number) => {
    setCamera((current) => ({ ...current, zoom: clamp(current.zoom * factor, 0.55, 2.2) }));
  };

  return (
    <div className="relative h-full min-h-96 overflow-hidden rounded-3xl bg-stone-100">
      <div className="pointer-events-none absolute start-4 top-4 z-10 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm">
        {room.name} • {scene.furnitureCount} פריטי ריהוט • גררו לסיבוב
      </div>
      {rendererStatus === 'unavailable' ? (
        <div
          className="flex min-h-96 items-center justify-center px-6 text-center text-sm text-stone-600"
          data-testid="apartment-3d-fallback"
          role="img"
          aria-label={`הדמיית חדר תלת־ממדית עבור ${room.name}`}
        >
          הדמיית התלת־ממד אינה זמינה בדפדפן הזה. אפשר להמשיך לעבוד בתצוגת 2D.
        </div>
      ) : null}
      <canvas
        ref={canvasRef}
        className={
          rendererStatus === 'unavailable'
            ? 'hidden'
            : 'h-full min-h-96 w-full cursor-grab touch-none focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-amber-700 active:cursor-grabbing'
        }
        role="img"
        tabIndex={rendererStatus === 'unavailable' ? -1 : 0}
        aria-label={`הדמיית חדר תלת־ממדית עבור ${room.name}, ${scene.wallCount} קירות, ${furnitureSummary}, ${cabinetSummary}`}
        data-testid="apartment-3d-canvas"
        data-scene-walls={scene.wallCount}
        data-scene-cutaway-walls={scene.cutawayWallCount}
        data-scene-cabinets={scene.cabinetCount}
        data-scene-furniture={scene.furnitureCount}
        data-scene-beds={scene.bedCount}
        data-camera-yaw={camera.yaw.toFixed(2)}
        data-camera-pitch={camera.pitch.toFixed(2)}
        data-camera-zoom={camera.zoom.toFixed(2)}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          dragOriginRef.current = {
            x: event.clientX,
            y: event.clientY,
            yaw: camera.yaw,
            pitch: camera.pitch,
          };
        }}
        onPointerMove={(event) => {
          const origin = dragOriginRef.current;
          if (!origin) return;
          setCamera((current) => ({
            ...current,
            yaw: origin.yaw + (event.clientX - origin.x) * 0.008,
            pitch: clamp(origin.pitch - (event.clientY - origin.y) * 0.006, -1.25, -0.14),
          }));
        }}
        onPointerUp={(event) => {
          dragOriginRef.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={() => {
          dragOriginRef.current = null;
        }}
        onWheel={(event) => {
          event.preventDefault();
          changeZoom(event.deltaY > 0 ? 0.9 : 1.1);
        }}
        onKeyDown={(event) => {
          const nextCamera = cameraAfterKey(camera, event.key);
          if (nextCamera !== camera) {
            event.preventDefault();
            setCamera(nextCamera);
          }
        }}
      />
      {rendererStatus === 'ready' ? (
        <div
          className="absolute inset-x-0 bottom-4 z-10 mx-auto flex w-fit gap-1 rounded-full bg-stone-950/75 p-1.5 shadow-lg backdrop-blur"
          role="toolbar"
          aria-label="בקרי מצלמה תלת־ממדית"
        >
          <button
            type="button"
            className="rounded-full px-3 py-2 text-sm font-bold text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
            aria-label="סובב שמאלה"
            onClick={() => setCamera((current) => ({ ...current, yaw: current.yaw - 0.2 }))}
          >
            ↶
          </button>
          <button
            type="button"
            className="rounded-full px-3 py-2 text-sm font-bold text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
            aria-label="סובב ימינה"
            onClick={() => setCamera((current) => ({ ...current, yaw: current.yaw + 0.2 }))}
          >
            ↷
          </button>
          <button
            type="button"
            className="rounded-full px-3 py-2 text-sm font-bold text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
            aria-label="הטה מעלה"
            onClick={() => setCamera((current) => ({ ...current, pitch: clamp(current.pitch - 0.12, -1.25, -0.14) }))}
          >
            ↑
          </button>
          <button
            type="button"
            className="rounded-full px-3 py-2 text-sm font-bold text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
            aria-label="הטה מטה"
            onClick={() => setCamera((current) => ({ ...current, pitch: clamp(current.pitch + 0.12, -1.25, -0.14) }))}
          >
            ↓
          </button>
          <button
            type="button"
            className="rounded-full px-3 py-2 text-sm font-bold text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
            aria-label="התקרב"
            onClick={() => changeZoom(1.14)}
          >
            +
          </button>
          <button
            type="button"
            className="rounded-full px-3 py-2 text-sm font-bold text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
            aria-label="התרחק"
            onClick={() => changeZoom(1 / 1.14)}
          >
            −
          </button>
          <button
            type="button"
            className="rounded-full px-3 py-2 text-xs font-semibold text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
            aria-label="אפס מצלמה"
            onClick={() => setCamera({ ...INITIAL_CAMERA })}
          >
            איפוס
          </button>
        </div>
      ) : null}
      <div className="sr-only" aria-live="polite">
        <p>
          רוחב החדר {Math.round(scene.roomWidth / 10)} ס״מ, עומק החדר {Math.round(scene.roomDepth / 10)} ס״מ. אפשר לסובב
          עם מקשי החצים, להתקרב עם פלוס ולהתרחק עם מינוס.
        </p>
        {roomPlacements.map((placement) => (
          <p key={placement.id}>
            ארון ברוחב {Math.round(placement.width / 10)} ס״מ, גובה {Math.round(placement.height / 10)} ס״מ ועומק{' '}
            {Math.round(placement.depth / 10)} ס״מ.
          </p>
        ))}
        {roomFurniture.map((item) => (
          <p key={item.id}>
            {item.label} במידות {Math.round(item.width / 10)}×{Math.round(item.depth / 10)} ס״מ.
          </p>
        ))}
      </div>
    </div>
  );
}
