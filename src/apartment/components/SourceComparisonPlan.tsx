import { useState } from 'react';
import type { Apartment, Point } from '../types';
import { modelPlanPointToSourcePlanPoint, TIFERET_SOURCE_PLAN_BOUNDS } from '../data/tiferet-source-plan';

const SOURCE_IMAGE_URL = `${import.meta.env.BASE_URL}tiferet/sheet-5-1-full.png`;

function sourcePolygon(points: readonly Point[]): string {
  return points
    .map(modelPlanPointToSourcePlanPoint)
    .map((point) => `${point.x},${point.y}`)
    .join(' ');
}

export function SourceComparisonPlan({ apartment }: { apartment: Apartment }) {
  const [modelOpacity, setModelOpacity] = useState(55);
  const bounds = apartment.source.sourcePlanBoundsPoints ?? TIFERET_SOURCE_PLAN_BOUNDS;
  const pageWidth = apartment.source.pageWidthPoints ?? 2_268;
  const pageHeight = apartment.source.pageHeightPoints ?? 1_193;
  const wallMasses = apartment.wallMasses ?? [];

  return (
    <article className="flex h-full min-h-96 flex-col overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 bg-stone-50 px-4 py-3">
        <div>
          <strong className="block text-sm">בדיקת חפיפה מול תוכנית המקור</strong>
          <span className="text-xs text-stone-600">מסות הקיר והחדרים מונחים באותה מערכת קואורדינטות של ה־PDF</span>
        </div>
        <label className="flex min-w-64 items-center gap-3 text-sm font-semibold text-stone-700">
          שקיפות שכבת המודל
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={modelOpacity}
            onChange={(event) => setModelOpacity(Number(event.target.value))}
            className="min-w-28 accent-[#9a4f31]"
          />
          <output className="w-10 text-end tabular-nums">{modelOpacity}%</output>
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-[#d8d4cd] p-3 sm:p-5">
        <svg
          role="img"
          aria-label="השוואת תוכנית 5-1 למודל הנקי"
          viewBox={`${bounds.x0} ${bounds.top} ${bounds.x1 - bounds.x0} ${bounds.bottom - bounds.top}`}
          className="mx-auto block h-auto max-h-full w-full bg-white shadow-lg"
        >
          <image href={SOURCE_IMAGE_URL} x="0" y="0" width={pageWidth} height={pageHeight} preserveAspectRatio="none" />
          <g data-testid="source-model-overlay" opacity={modelOpacity / 100}>
            {wallMasses.map((mass) => {
              const rect = mass.sourcePdfRect;
              if (!rect) return null;
              return (
                <rect
                  key={mass.id}
                  data-testid={`source-overlay-wall-mass-${mass.id}`}
                  x={rect.x0}
                  y={rect.top}
                  width={rect.x1 - rect.x0}
                  height={rect.bottom - rect.top}
                  fill="#bd4a2f"
                  stroke="#7f2d1d"
                  strokeWidth="0.7"
                />
              );
            })}
            {apartment.rooms.map((room) => (
              <polygon
                key={room.id}
                points={sourcePolygon(room.polygon)}
                fill="none"
                stroke="#00869c"
                strokeWidth="1.4"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {apartment.walls.map((wall) => {
              const start = modelPlanPointToSourcePlanPoint(wall.start);
              const end = modelPlanPointToSourcePlanPoint(wall.end);
              return (
                <line
                  key={wall.id}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke="#f4ca52"
                  strokeWidth="1.2"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </g>
        </svg>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-stone-200 bg-white px-4 py-2 text-xs text-stone-600">
        <span>{wallMasses.length} מסות קיר מהמקור</span>
        <span className="text-[#9a3e27]">■ מסות קיר</span>
        <span className="text-[#00768a]">□ גבולות חדרים</span>
        <span className="text-[#92710a]">— קווי קיר תכנוניים</span>
      </div>
    </article>
  );
}
