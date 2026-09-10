import { pickSceneObject } from '../three/picking';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createApartmentRoomRenderer, type ApartmentRoomRenderer, type CameraOrbit } from '../three/renderer';
import { buildApartmentRoomScene, DEFAULT_ROOM_CAMERA_YAW } from '../three/scene';
import type { Apartment, CabinetPlacement, FurniturePalette } from '../types';

type RendererStatus = 'checking' | 'ready' | 'unavailable';

interface Room3DProps {
  apartment: Apartment;
  roomId: string | null;
  placements: CabinetPlacement[];
  showFurniture?: boolean;
  furniturePalette?: FurniturePalette;
  selectedObjectId?: string | null;
  initialCamera?: CameraOrbit;
  onCameraChange?: (roomId: string, camera: CameraOrbit) => void;
  onObjectSelect?: (id: string) => void;
  onFallback2D?: () => void;
}

interface DragOrigin {
  x: number;
  y: number;
  yaw: number;
  pitch: number;
}

const INITIAL_CAMERA: CameraOrbit = { yaw: DEFAULT_ROOM_CAMERA_YAW, pitch: -0.52, zoom: 0.98 };

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
  selectedObjectId = null,
  initialCamera,
  onCameraChange,
  onObjectSelect,
  onFallback2D,
}: Room3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragOriginRef = useRef<DragOrigin | null>(null);
  const rendererRef = useRef<ApartmentRoomRenderer | null>(null);
  const cameraRef = useRef<CameraOrbit>(initialCamera ?? INITIAL_CAMERA);
  const initialCameraRef = useRef<CameraOrbit | undefined>(initialCamera);
  const onCameraChangeRef = useRef(onCameraChange);
  const drawRef = useRef<() => void>(() => undefined);
  const [rendererStatus, setRendererStatus] = useState<RendererStatus>('checking');
  const [camera, setCamera] = useState<CameraOrbit>(() => ({ ...(initialCamera ?? INITIAL_CAMERA) }));
  const room =
    apartment.rooms.find((item) => item.id === roomId) ??
    apartment.rooms.find((item) => item.id === placements[0]?.roomId) ??
    apartment.rooms[0];
  const previousRoomIdRef = useRef(room.id);
  initialCameraRef.current = initialCamera;
  onCameraChangeRef.current = onCameraChange;
  const roomPlacements = useMemo(
    () => placements.filter((placement) => placement.roomId === room.id),
    [placements, room.id],
  );
  const roomFurniture = useMemo(
    () => (showFurniture ? (apartment.furniture ?? []).filter((item) => item.roomId === room.id) : []),
    [apartment.furniture, room.id, showFurniture],
  );
  const cutawayYaw = Math.round(camera.yaw / (Math.PI / 2)) * (Math.PI / 2);
  const scene = useMemo(
    () =>
      buildApartmentRoomScene(apartment, room, roomPlacements, {
        showFurniture,
        furniturePalette,
        cameraYaw: cutawayYaw,
        selectedObjectId: selectedObjectId ?? undefined,
      }),
    [apartment, cutawayYaw, furniturePalette, room, roomPlacements, selectedObjectId, showFurniture],
  );
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  cameraRef.current = camera;
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
    if (previousRoomIdRef.current === room.id) return;
    previousRoomIdRef.current = room.id;
    const nextCamera = { ...(initialCameraRef.current ?? INITIAL_CAMERA) };
    cameraRef.current = nextCamera;
    setCamera(nextCamera);
  }, [room.id]);

  useEffect(() => {
    if (cameraRef.current !== camera) return;
    onCameraChangeRef.current?.(room.id, camera);
  }, [camera, room.id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const renderer = rendererRef.current;
      if (!renderer) return;
      const pixelRatio = clamp(window.devicePixelRatio || 1, 1, 2);
      const width = Math.max(1, Math.round((canvas.clientWidth || 960) * pixelRatio));
      const height = Math.max(1, Math.round((canvas.clientHeight || 540) * pixelRatio));
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      renderer.draw(cameraRef.current, width, height);
    };
    const initialize = () => {
      const gl = canvas.getContext('webgl', {
        alpha: false,
        antialias: true,
        depth: true,
        powerPreference: 'high-performance',
      });
      const renderer = gl ? createApartmentRoomRenderer(gl) : null;
      rendererRef.current = renderer;
      if (!renderer) {
        setRendererStatus('unavailable');
        return;
      }
      renderer.setScene(sceneRef.current);
      setRendererStatus('ready');
      draw();
    };
    const lost = (event: Event) => {
      event.preventDefault();
      rendererRef.current = null;
      dragOriginRef.current = null;
      setRendererStatus('unavailable');
    };
    drawRef.current = draw;
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', initialize);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(draw);
    observer?.observe(canvas);
    window.addEventListener('resize', draw);
    initialize();
    return () => {
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', initialize);
      window.removeEventListener('resize', draw);
      observer?.disconnect();
      rendererRef.current?.dispose();
      rendererRef.current = null;
      drawRef.current = () => undefined;
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.setScene(scene);
    drawRef.current();
  }, [scene]);

  useEffect(() => {
    drawRef.current();
  }, [camera]);

  const changeZoom = (factor: number) => {
    setCamera((current) => ({ ...current, zoom: clamp(current.zoom * factor, 0.55, 2.2) }));
  };

  return (
    <div className="relative h-full min-h-96 overflow-hidden rounded-3xl bg-stone-100">
      <div className="pointer-events-none absolute inset-x-4 top-4 z-10 truncate rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm">
        {room.name} • {scene.furnitureCount} פריטי ריהוט • {scene.openingCount} פתחים • גררו לסיבוב
      </div>
      {rendererStatus === 'ready' ? (
        <div
          className="absolute end-4 top-16 z-10 flex max-w-[calc(100%_-_2rem)] flex-wrap justify-end gap-1 rounded-xl bg-white/90 p-1 shadow-sm backdrop-blur"
          role="group"
          aria-label="מבטים מוכנים"
        >
          <button
            type="button"
            onClick={() => setCamera({ yaw: camera.yaw, pitch: -1.2, zoom: 0.68 })}
            className="rounded-lg px-2.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100"
          >
            מבט על
          </button>
          <button
            type="button"
            onClick={() => setCamera({ yaw: Math.PI, pitch: -0.3, zoom: 0.86 })}
            className="rounded-lg px-2.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100"
          >
            מבט חזית
          </button>
          <button
            type="button"
            onClick={() => setCamera({ ...INITIAL_CAMERA })}
            className="rounded-lg px-2.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100"
          >
            התאם חדר למסך
          </button>
        </div>
      ) : null}
      {rendererStatus === 'unavailable' ? (
        <div
          className="flex min-h-96 items-center justify-center px-6 text-center text-sm text-stone-600"
          data-testid="apartment-3d-fallback"
          role="img"
          aria-label={`הדמיית חדר תלת־ממדית עבור ${room.name}`}
        >
          <div>
            <p>הדמיית התלת־ממד אינה זמינה כעת. התכנון נשמר ואפשר להמשיך בתצוגת 2D.</p>
            {onFallback2D && (
              <button
                type="button"
                onClick={onFallback2D}
                className="mt-4 rounded-xl border border-stone-400 px-4 py-3"
              >
                מעבר לתצוגת 2D
              </button>
            )}
          </div>
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
        aria-label={`הדמיית חדר תלת־ממדית עבור ${room.name}, ${scene.wallCount} קירות, ${scene.openingCount} פתחים, ${furnitureSummary}, ${cabinetSummary}`}
        data-testid="apartment-3d-canvas"
        data-scene-walls={scene.wallCount}
        data-scene-cutaway-walls={scene.cutawayWallCount}
        data-scene-cabinets={scene.cabinetCount}
        data-scene-furniture={scene.furnitureCount}
        data-scene-beds={scene.bedCount}
        data-scene-openings={scene.openingCount}
        data-camera-yaw={camera.yaw.toFixed(2)}
        data-camera-pitch={camera.pitch.toFixed(2)}
        data-camera-zoom={camera.zoom.toFixed(2)}
        data-renderer-status={rendererStatus}
        data-selected-object={selectedObjectId ?? undefined}
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
          const origin = dragOriginRef.current;
          if (origin && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) < 5) {
            const bounds = event.currentTarget.getBoundingClientRect();
            const id = pickSceneObject(
              scene,
              camera,
              ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
              1 - ((event.clientY - bounds.top) / bounds.height) * 2,
              bounds.width / bounds.height,
            );
            if (id) onObjectSelect?.(id);
          }
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
      {onObjectSelect && roomFurniture.length > 0 ? (
        <div
          className="absolute start-4 bottom-20 z-10 flex max-w-[70%] gap-1.5 overflow-x-auto rounded-2xl bg-white/90 p-2 shadow-lg backdrop-blur"
          role="listbox"
          aria-label="בחירת ריהוט בחדר"
        >
          {roomFurniture.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={item.id === selectedObjectId}
              aria-label={`עריכת ${item.label}, פריט ${index + 1}`}
              onClick={() => onObjectSelect(item.id)}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition ${item.id === selectedObjectId ? 'bg-amber-700 text-white shadow-sm' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
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
