import { PartProjection } from './PartProjection';
import { useState, useCallback, useRef, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { getMaterial } from '../../engine/materials';
import { formatDim } from '../../utils/units';
import { useTouchGestures } from '../../hooks/useTouchGestures';
import { IconDownload } from '../layout/Icons';
import { WebGLPreviewCanvas } from './WebGLPreviewCanvas';
import { downloadSvg, downloadPng } from './preview-download-utils';

type ViewId = 'front' | 'frontOpen' | 'side' | 'top' | 'back' | '3d';

export const CabinetPreview = memo(function CabinetPreview() {
  const { t } = useTranslation();
  const { config, setConfig, units } = useCabinetStore();
  /** Format a mm value using the active unit system */
  const fd = (mm: number) => formatDim(mm, units);
  const [activeView, setActiveView] = useState<ViewId>('front');
  const previewRef = useRef<HTMLDivElement>(null);
  const [showDims, setShowDims] = useState(true);
  const [zoomScale, setZoomScale] = useState(1);
  const [orbitYaw, setOrbitYaw] = useState(0);
  const [orbitPitch, setOrbitPitch] = useState(0);
  const [orbitZoom, setOrbitZoom] = useState(1);
  const [draggingOrbit, setDraggingOrbit] = useState(false);
  const orbitStartRef = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  /** Phase 12 / Sprint 14 — toggle isometric vs. animated WebGL view (only relevant when VITE_ENABLE_WEBGL=true). */
  const [webglIsometric, setWebglIsometric] = useState(true);

  const views = useMemo<{ id: ViewId; label: string }[]>(
    () => [
      { id: 'front', label: t('preview.front') },
      { id: 'frontOpen', label: t('preview.frontOpen') },
      { id: 'side', label: t('preview.side') },
      { id: 'top', label: t('preview.top') },
      { id: 'back', label: t('preview.back') },
      { id: '3d', label: t('preview.iso') },
    ],
    [t],
  );

  const viewIds = useMemo(() => views.map((v) => v.id), [views]);

  const touchGestures = useTouchGestures({
    onPinchZoom: setZoomScale,
    onSwipeLeft: () => {
      const idx = viewIds.indexOf(activeView);
      if (idx < viewIds.length - 1) {
        setActiveView(viewIds[idx + 1]);
        setZoomScale(1);
      }
    },
    onSwipeRight: () => {
      const idx = viewIds.indexOf(activeView);
      if (idx > 0) {
        setActiveView(viewIds[idx - 1]);
        setZoomScale(1);
      }
    },
  });

  const handleOrbitStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      setWebglIsometric(false);
      orbitStartRef.current = { x: e.clientX, y: e.clientY, yaw: orbitYaw, pitch: orbitPitch };
      setDraggingOrbit(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [orbitPitch, orbitYaw],
  );

  const handleOrbitMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const start = orbitStartRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    setOrbitYaw(start.yaw + dx * 0.25);
    setOrbitPitch(Math.max(-60, Math.min(60, start.pitch - dy * 0.2)));
  }, []);

  const handleOrbitEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    orbitStartRef.current = null;
    setDraggingOrbit(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const handleOrbitWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOrbitZoom((z) => Math.max(0.6, Math.min(2.4, z - e.deltaY * 0.0015)));
  }, []);

  const webglEnabled = import.meta.env.VITE_ENABLE_WEBGL === 'true';

  return (
    <div className="space-y-4">
      {/* View tab bar */}
      <div className="flex flex-wrap items-center gap-1">
        <div role="tablist" aria-label="Cabinet view selector" className="flex flex-wrap gap-1">
          {views.map((v) => (
            <button
              key={v.id}
              role="tab"
              aria-selected={activeView === v.id}
              onClick={() => setActiveView(v.id)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                activeView === v.id
                  ? 'bg-wood-600 text-white'
                  : 'bg-wood-100 dark:bg-wood-800 text-wood-600 dark:text-wood-300 hover:bg-wood-200 dark:hover:bg-wood-700'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <label className="text-wood-600 dark:text-wood-300 ms-auto flex cursor-pointer items-center gap-1.5 text-xs select-none">
          <input
            type="checkbox"
            checked={showDims}
            onChange={(e) => setShowDims(e.target.checked)}
            className="accent-primary"
          />
          {t('preview.dimensions')}
        </label>
        <button
          onClick={() => previewRef.current && downloadSvg(previewRef.current, `cabinet-${activeView}.svg`)}
          className="bg-wood-100 dark:bg-wood-800 text-wood-600 dark:text-wood-300 hover:bg-wood-200 dark:hover:bg-wood-700 ms-2 flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors"
          aria-label={t('preview.exportSvg')}
          title={t('preview.exportSvg')}
        >
          <IconDownload size={11} /> SVG
        </button>
        <button
          onClick={() => previewRef.current && downloadPng(previewRef.current, `cabinet-${activeView}.png`)}
          className="bg-wood-100 dark:bg-wood-800 text-wood-600 dark:text-wood-300 hover:bg-wood-200 dark:hover:bg-wood-700 ms-1 flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors"
          aria-label={t('preview.exportPng')}
          title={t('preview.exportPng')}
        >
          <IconDownload size={11} /> PNG
        </button>
        {zoomScale !== 1 && (
          <button
            onClick={() => setZoomScale(1)}
            className="ms-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:hover:bg-amber-800"
          >
            {Math.round(zoomScale * 100)}% ✕
          </button>
        )}
      </div>

      {/* Active view */}
      <div
        ref={previewRef}
        className="relative touch-none overflow-auto"
        onTouchStart={(e) => {
          if (activeView !== '3d') touchGestures.onTouchStart(e);
        }}
        onTouchMove={(e) => {
          if (activeView !== '3d') touchGestures.onTouchMove(e);
        }}
        onTouchEnd={(e) => {
          if (activeView !== '3d') touchGestures.onTouchEnd(e);
        }}
        style={{ transform: `scale(${zoomScale})`, transformOrigin: 'top left' }}
      >
        {activeView !== '3d' && (
          <PartProjection
            config={config}
            view={activeView}
            showDims={showDims}
            formatDimension={fd}
            onChange={setConfig}
          />
        )}
        {activeView === '3d' && (
          <div
            className={`relative transform-gpu ${draggingOrbit ? 'cursor-grabbing' : 'cursor-grab'}`}
            style={{
              transform: webglEnabled
                ? undefined
                : `perspective(1400px) rotateX(${orbitPitch}deg) rotateY(${orbitYaw}deg)`,
              transformStyle: 'preserve-3d',
              transition: webglEnabled ? undefined : draggingOrbit ? 'none' : 'transform 120ms linear',
            }}
            onPointerDown={handleOrbitStart}
            onPointerMove={handleOrbitMove}
            onPointerUp={handleOrbitEnd}
            onPointerCancel={handleOrbitEnd}
            onWheel={handleOrbitWheel}
            onDoubleClick={() => {
              setOrbitYaw(0);
              setOrbitPitch(0);
              setOrbitZoom(1);
            }}
          >
            <PartProjection config={config} view="3d" showDims={showDims} formatDimension={fd} />
            {/* Phase 12 / Sprint 14 — WebGL canvas overlaid when VITE_ENABLE_WEBGL=true.
                WebGLPreviewCanvas returns null when the flag is absent. */}
            <WebGLPreviewCanvas
              config={config}
              materialColor={getMaterial(config.carcassMaterial, config.materialCatalog).color}
              isometric={webglIsometric}
              orbitYawDeg={orbitYaw}
              orbitPitchDeg={orbitPitch}
              zoom={orbitZoom}
              className="absolute inset-0 h-full w-full"
            />
            <div className="absolute inset-s-2 bottom-2 rounded bg-black/45 px-2 py-0.5 text-[10px] text-white">
              {t('preview.dragToRotate')} • {Math.round(orbitZoom * 100)}%
            </div>
            <button
              type="button"
              onClick={() => {
                setOrbitYaw(0);
                setOrbitPitch(0);
                setOrbitZoom(1);
                setWebglIsometric(true);
              }}
              className="absolute inset-e-2 top-2 rounded bg-black/40 px-2 py-0.5 text-[10px] text-white hover:bg-black/60"
              title={t('preview3d.resetCamera')}
            >
              {t('preview3d.resetCamera')}
            </button>
            {import.meta.env.VITE_ENABLE_WEBGL === 'true' && (
              <button
                type="button"
                onClick={() => setWebglIsometric((v) => !v)}
                className="absolute inset-e-2 bottom-2 rounded bg-black/40 px-2 py-0.5 text-[10px] text-white hover:bg-black/60"
                aria-pressed={webglIsometric}
                title={t('preview.webglToggle')}
              >
                {webglIsometric ? t('preview.webglAnimate') : t('preview.webglIsometric')}
              </button>
            )}
          </div>
        )}
      </div>
      {/* Sprint 76 — W × H × D dimension summary label */}
      <p
        className="text-wood-500 dark:text-wood-400 text-center text-xs tabular-nums"
        aria-label={t('preview.dimensionSummary')}
      >
        W {fd(config.width)} × H {fd(config.height)} × D {fd(config.depth)}
      </p>
      {/* Sprint 89 — door / drawer count indicator pills */}
      {(config.doorStyle !== 'none' || config.drawerCount > 0) && (
        <p className="text-wood-400 dark:text-wood-500 mt-0.5 flex justify-center gap-2 text-center text-xs">
          {config.doorStyle !== 'none' && (
            <span>
              {config.doorCount} {t('preview.doors')}
            </span>
          )}
          {config.drawerCount > 0 && (
            <span>
              {config.drawerCount} {t('preview.drawers')}
            </span>
          )}
        </p>
      )}
    </div>
  );
});
