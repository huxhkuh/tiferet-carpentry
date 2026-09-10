import { useMemo, useRef, useState } from 'react';
import type { CabinetConfig } from '../../engine/types';
import { buildPartInstances } from '../../engine/part-instances';
import { computeDimensions } from '../../engine/dimensions';
import { resolveMaterial } from '../../engine/materials';

type View = 'front' | 'frontOpen' | 'side' | 'top' | 'back' | '3d';
type Point3 = readonly [number, number, number];

export function PartProjection({
  config,
  view,
  showDims,
  formatDimension,
  onChange,
}: {
  config: CabinetConfig;
  view: View;
  showDims: boolean;
  formatDimension: (value: number) => string;
  onChange?: (update: Partial<CabinetConfig>) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragLevel, setDragLevel] = useState<number | null>(null);
  const instances = useMemo(() => buildPartInstances(config), [config]);
  const dims = computeDimensions(config);
  const materialThickness = config.height - (config.kickHeight ?? 0) - dims.internalHeight;
  const plinth = config.furnitureType === 'cabinet' || config.furnitureType === 'wardrobe' ? config.kickHeight : 0;
  const shelves = instances.filter((instance) => instance.part.name.en === 'Adjustable Shelf');
  const shelfLevels = [...new Set(shelves.map((instance) => instance.center[1] - instance.size[1] / 2))];
  const project = ([x, y, z]: Point3): [number, number, number] => {
    if (view === '3d') return [(x - z) * 0.866, (x + z) * 0.5 - y, x + y + z];
    if (view === 'side') return [z, -y, x];
    if (view === 'top') return [x, -z, y];
    if (view === 'back') return [-x, -y, -z];
    return [x, -y, z];
  };
  const faces = instances
    .flatMap((instance) => {
      const name = instance.part.name.en;
      if (view === 'frontOpen' && (name.includes('Door') || name === 'Back Panel')) return [];
      const [x, y, z] = instance.center,
        [w, h, d] = instance.size;
      const corners: Point3[] = [
        [x - w / 2, y - h / 2, z - d / 2],
        [x + w / 2, y - h / 2, z - d / 2],
        [x + w / 2, y + h / 2, z - d / 2],
        [x - w / 2, y + h / 2, z - d / 2],
        [x - w / 2, y - h / 2, z + d / 2],
        [x + w / 2, y - h / 2, z + d / 2],
        [x + w / 2, y + h / 2, z + d / 2],
        [x - w / 2, y + h / 2, z + d / 2],
      ];
      const indexes =
        view === '3d'
          ? [
              [4, 5, 6, 7],
              [1, 5, 6, 2],
              [3, 2, 6, 7],
            ]
          : view === 'side'
            ? [[1, 5, 6, 2]]
            : view === 'top'
              ? [[3, 2, 6, 7]]
              : view === 'back'
                ? [[0, 1, 2, 3]]
                : [[4, 5, 6, 7]];
      return indexes.map((indices, face) => {
        const points = indices.map((index) => project(corners[index]));
        return { instance, face, points, depth: points.reduce((sum, point) => sum + point[2], 0) / 4 };
      });
    })
    .sort((a, b) => a.depth - b.depth);
  const points = faces.flatMap((face) => face.points);
  const minX = Math.min(0, ...points.map((point) => point[0])),
    maxX = Math.max(1, ...points.map((point) => point[0]));
  const minY = Math.min(0, ...points.map((point) => point[1])),
    maxY = Math.max(1, ...points.map((point) => point[1]));
  const pad = Math.max(maxX - minX, maxY - minY) / 15;
  const changeShelf = (level: number, bottom: number) => {
    const thickness = shelves[0]?.size[1] ?? materialThickness / 2;
    const positions = shelfLevels.map((value) => value - plinth - thickness);
    positions[level] = Math.max(thickness, Math.min(dims.internalHeight - thickness, bottom - plinth - thickness));
    onChange?.({ shelfSpacing: 'custom', customShelfPositions: positions });
  };
  return (
    <svg
      ref={svgRef}
      viewBox={`${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`}
      role="img"
      aria-label={view === '3d' ? '3D isometric cabinet drawing' : 'Cabinet drawing'}
      className="border-wood-200 dark:border-wood-700 dark:bg-wood-800 max-h-125 w-full max-w-lg touch-none rounded border bg-white"
      onPointerMove={(event) => {
        if (dragLevel === null || !svgRef.current) return;
        const point = svgRef.current.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        const matrix = svgRef.current.getScreenCTM();
        if (matrix) changeShelf(dragLevel, -point.matrixTransform(matrix.inverse()).y);
      }}
      onPointerUp={() => setDragLevel(null)}
      onPointerCancel={() => setDragLevel(null)}
    >
      {faces.map(({ instance, face, points }) => {
        const level = shelfLevels.indexOf(instance.center[1] - instance.size[1] / 2);
        const editable = view === 'frontOpen' && instance.part.name.en === 'Adjustable Shelf' && !!onChange;
        return (
          <polygon
            key={`${instance.id}-${face}`}
            points={points.map((point) => `${point[0]},${point[1]}`).join(' ')}
            fill={resolveMaterial(instance.part).color}
            stroke="#544739"
            strokeWidth={pad / 70}
            role={editable ? 'button' : undefined}
            tabIndex={editable ? 0 : undefined}
            aria-label={editable ? `${instance.part.name[config.lang]} ${level + 1}` : undefined}
            onKeyDown={(event) => {
              if (editable && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
                event.preventDefault();
                changeShelf(level, shelfLevels[level] + (event.key === 'ArrowUp' ? 10 : -10));
              }
            }}
            onPointerDown={(event) => {
              if (editable) {
                setDragLevel(level);
                event.currentTarget.setPointerCapture(event.pointerId);
              }
            }}
          >
            <title>{`${instance.part.name[config.lang]}: ${instance.part.length}×${instance.part.width}×${instance.part.thickness} mm`}</title>
          </polygon>
        );
      })}
      {(view === 'front' || view === 'back') &&
        instances
          .filter((instance) => instance.part.name.en === 'Centre Support')
          .map((instance) => {
            const [x, y, z] = instance.center,
              [w, h] = instance.size;
            const corners = [
              [x - w / 2, y - h / 2, z],
              [x + w / 2, y - h / 2, z],
              [x + w / 2, y + h / 2, z],
              [x - w / 2, y + h / 2, z],
            ] as const;
            return (
              <polygon
                key={`hidden-${instance.id}`}
                points={corners.map((point) => project(point).slice(0, 2).join(',')).join(' ')}
                fill="none"
                stroke="#544739"
                strokeWidth={pad / 50}
                strokeDasharray={`${pad / 8} ${pad / 12}`}
              >
                <title>{instance.part.name[config.lang]}</title>
              </polygon>
            );
          })}
      {showDims && (
        <text x={(minX + maxX) / 2} y={maxY + pad * 0.65} textAnchor="middle" fontSize={pad * 0.32} fill="currentColor">
          {formatDimension(config.width)} × {formatDimension(config.height)} × {formatDimension(config.depth)}
        </text>
      )}
    </svg>
  );
}
