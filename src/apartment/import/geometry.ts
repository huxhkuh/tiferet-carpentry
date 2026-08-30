import type { Point, SourcePdfRect } from '../types';
import type {
  ImportCalibrationInput,
  ImportRoomDraft,
  ImportWallDraft,
  PdfImportDraft,
  PdfImportSource,
  PdfVectorDocument,
  PdfVectorRectangle,
} from './types';

interface GridCell {
  column: number;
  row: number;
}

const DIRECTIONS = [
  { column: 1, row: 0 },
  { column: -1, row: 0 },
  { column: 0, row: 1 },
  { column: 0, row: -1 },
] as const;
const MAX_GRID_CELLS = 100_000;

function isWallCandidate(rectangle: PdfVectorRectangle, document: PdfVectorDocument): boolean {
  const width = rectangle.x1 - rectangle.x0;
  const height = rectangle.bottom - rectangle.top;
  const longSide = Math.max(width, height);
  const shortSide = Math.min(width, height);
  const pageShortSide = Math.min(document.width, document.height);
  return (
    rectangle.x0 >= -document.width &&
    rectangle.top >= -document.height &&
    rectangle.x1 <= document.width * 2 &&
    rectangle.bottom <= document.height * 2 &&
    shortSide > 0 &&
    longSide / shortSide >= 3 &&
    shortSide <= pageShortSide * 0.1 &&
    longSide >= pageShortSide * 0.06
  );
}

function boundsOf(rectangles: readonly PdfVectorRectangle[], document: PdfVectorDocument): SourcePdfRect {
  if (rectangles.length === 0) return { x0: 0, top: 0, x1: document.width, bottom: document.height };
  return {
    x0: Math.min(...rectangles.map((rectangle) => rectangle.x0)),
    top: Math.min(...rectangles.map((rectangle) => rectangle.top)),
    x1: Math.max(...rectangles.map((rectangle) => rectangle.x1)),
    bottom: Math.max(...rectangles.map((rectangle) => rectangle.bottom)),
  };
}

function rectangleGap(left: PdfVectorRectangle, right: PdfVectorRectangle): number {
  const horizontal = Math.max(0, Math.max(left.x0, right.x0) - Math.min(left.x1, right.x1));
  const vertical = Math.max(0, Math.max(left.top, right.top) - Math.min(left.bottom, right.bottom));
  return Math.hypot(horizontal, vertical);
}

function selectPlanWallCluster(
  candidates: readonly PdfVectorRectangle[],
  document: PdfVectorDocument,
): PdfVectorRectangle[] {
  if (candidates.length <= 4) return [...candidates];
  const connectionDistance = Math.min(document.width, document.height) * 0.035;
  const visited = new Set<number>();
  const clusters: PdfVectorRectangle[][] = [];
  for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
    if (visited.has(candidateIndex)) continue;
    const cluster: PdfVectorRectangle[] = [];
    const queue = [candidateIndex];
    visited.add(candidateIndex);
    for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
      const index = queue[queueIndex];
      const candidate = index === undefined ? undefined : candidates[index];
      if (candidate === undefined) continue;
      cluster.push(candidate);
      candidates.forEach((other, otherIndex) => {
        if (visited.has(otherIndex) || rectangleGap(candidate, other) > connectionDistance) return;
        visited.add(otherIndex);
        queue.push(otherIndex);
      });
    }
    clusters.push(cluster);
  }
  return [...clusters].sort((left, right) => right.length - left.length)[0] ?? [];
}

function toWallDraft(rectangle: PdfVectorRectangle, index: number): ImportWallDraft {
  const width = rectangle.x1 - rectangle.x0;
  const height = rectangle.bottom - rectangle.top;
  return {
    id: `import-wall-${index + 1}`,
    sourceRect: { x0: rectangle.x0, top: rectangle.top, x1: rectangle.x1, bottom: rectangle.bottom },
    orientation: width >= height ? 'horizontal' : 'vertical',
  };
}

const cellKey = (column: number, row: number): string => `${column}:${row}`;

function isInsideRectangle(point: Point, rectangle: SourcePdfRect): boolean {
  return point.x >= rectangle.x0 && point.x <= rectangle.x1 && point.y >= rectangle.top && point.y <= rectangle.bottom;
}

function simplifyOrthogonalPolygon(points: readonly Point[]): Point[] {
  if (points.length < 4) return [...points];
  return points.filter((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    if (previous === undefined || next === undefined) return true;
    const sameX = previous.x === point.x && point.x === next.x;
    const sameY = previous.y === point.y && point.y === next.y;
    return !sameX && !sameY;
  });
}

function componentBounds(component: readonly GridCell[], origin: Point, cellSize: number): Point[] {
  const columns = component.map((cell) => cell.column);
  const rows = component.map((cell) => cell.row);
  const left = origin.x + Math.min(...columns) * cellSize;
  const right = origin.x + (Math.max(...columns) + 1) * cellSize;
  const top = origin.y + Math.min(...rows) * cellSize;
  const bottom = origin.y + (Math.max(...rows) + 1) * cellSize;
  return simplifyOrthogonalPolygon([
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ]);
}

interface GridVertex {
  x: number;
  y: number;
}

interface GridEdge {
  start: GridVertex;
  end: GridVertex;
}

const vertexKey = (vertex: GridVertex): string => `${vertex.x}:${vertex.y}`;

function polygonArea(points: readonly Point[]): number {
  return (
    points.reduce((area, point, index) => {
      const next = points[(index + 1) % points.length];
      return next === undefined ? area : area + point.x * next.y - next.x * point.y;
    }, 0) / 2
  );
}

function componentPolygon(component: readonly GridCell[], origin: Point, cellSize: number): Point[] {
  const cells = new Set(component.map((cell) => cellKey(cell.column, cell.row)));
  const edges: GridEdge[] = [];
  for (const cell of component) {
    const { column, row } = cell;
    if (!cells.has(cellKey(column, row - 1))) {
      edges.push({ start: { x: column, y: row }, end: { x: column + 1, y: row } });
    }
    if (!cells.has(cellKey(column + 1, row))) {
      edges.push({ start: { x: column + 1, y: row }, end: { x: column + 1, y: row + 1 } });
    }
    if (!cells.has(cellKey(column, row + 1))) {
      edges.push({ start: { x: column + 1, y: row + 1 }, end: { x: column, y: row + 1 } });
    }
    if (!cells.has(cellKey(column - 1, row))) {
      edges.push({ start: { x: column, y: row + 1 }, end: { x: column, y: row } });
    }
  }
  const outgoing = new Map<string, number[]>();
  edges.forEach((edge, index) => {
    const key = vertexKey(edge.start);
    outgoing.set(key, [...(outgoing.get(key) ?? []), index]);
  });
  const used = new Set<number>();
  const loops: Point[][] = [];
  edges.forEach((edge, edgeIndex) => {
    if (used.has(edgeIndex)) return;
    const vertices: GridVertex[] = [edge.start];
    let currentIndex: number | undefined = edgeIndex;
    while (currentIndex !== undefined && !used.has(currentIndex)) {
      used.add(currentIndex);
      const current: GridEdge | undefined = edges[currentIndex];
      if (current === undefined) break;
      vertices.push(current.end);
      if (vertexKey(current.end) === vertexKey(vertices[0] ?? current.end)) break;
      currentIndex = (outgoing.get(vertexKey(current.end)) ?? []).find((index) => !used.has(index));
    }
    const firstVertex = vertices[0];
    if (
      firstVertex === undefined ||
      vertices.length < 4 ||
      vertexKey(vertices.at(-1) ?? { x: -1, y: -1 }) !== vertexKey(firstVertex)
    )
      return;
    const points = simplifyOrthogonalPolygon(
      vertices.slice(0, -1).map((vertex) => ({
        x: origin.x + vertex.x * cellSize,
        y: origin.y + vertex.y * cellSize,
      })),
    );
    if (points.length >= 3) loops.push(points);
  });
  return (
    [...loops].sort((left, right) => Math.abs(polygonArea(right)) - Math.abs(polygonArea(left)))[0] ??
    componentBounds(component, origin, cellSize)
  );
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 1;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? 1;
}

function bridgeTopologyGaps(walls: readonly ImportWallDraft[], typicalThickness: number): SourcePdfRect[] {
  const bridges: SourcePdfRect[] = [];
  const maximumGap = typicalThickness * 18;
  walls.forEach((wall, index) => {
    walls.slice(index + 1).forEach((other) => {
      if (wall.orientation !== other.orientation) return;
      if (wall.orientation === 'horizontal') {
        const wallY = (wall.sourceRect.top + wall.sourceRect.bottom) / 2;
        const otherY = (other.sourceRect.top + other.sourceRect.bottom) / 2;
        const gap = Math.max(
          0,
          Math.max(wall.sourceRect.x0, other.sourceRect.x0) - Math.min(wall.sourceRect.x1, other.sourceRect.x1),
        );
        if (Math.abs(wallY - otherY) > typicalThickness * 2 || gap <= 0 || gap > maximumGap) return;
        const left = wall.sourceRect.x1 < other.sourceRect.x0 ? wall.sourceRect.x1 : other.sourceRect.x1;
        const right = wall.sourceRect.x1 < other.sourceRect.x0 ? other.sourceRect.x0 : wall.sourceRect.x0;
        bridges.push({
          x0: left,
          x1: right,
          top: Math.min(wallY, otherY) - typicalThickness / 2,
          bottom: Math.max(wallY, otherY) + typicalThickness / 2,
        });
      } else {
        const wallX = (wall.sourceRect.x0 + wall.sourceRect.x1) / 2;
        const otherX = (other.sourceRect.x0 + other.sourceRect.x1) / 2;
        const gap = Math.max(
          0,
          Math.max(wall.sourceRect.top, other.sourceRect.top) -
            Math.min(wall.sourceRect.bottom, other.sourceRect.bottom),
        );
        if (Math.abs(wallX - otherX) > typicalThickness * 2 || gap <= 0 || gap > maximumGap) return;
        const top = wall.sourceRect.bottom < other.sourceRect.top ? wall.sourceRect.bottom : other.sourceRect.bottom;
        const bottom = wall.sourceRect.bottom < other.sourceRect.top ? other.sourceRect.top : wall.sourceRect.top;
        bridges.push({
          x0: Math.min(wallX, otherX) - typicalThickness / 2,
          x1: Math.max(wallX, otherX) + typicalThickness / 2,
          top,
          bottom,
        });
      }
    });
  });
  return bridges;
}

function uniqueSorted(values: readonly number[]): number[] {
  return [...values]
    .sort((left, right) => left - right)
    .filter((value, index, sorted) => index === 0 || Math.abs(value - (sorted[index - 1] ?? value)) > 2);
}

function boundingArea(points: readonly Point[]): number {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
}

function inferRoomsFromWallGrid(
  document: PdfVectorDocument,
  walls: readonly ImportWallDraft[],
  planBounds: SourcePdfRect,
): ImportRoomDraft[] {
  if (walls.length < 4) return [];
  const xLines = uniqueSorted([
    planBounds.x0,
    planBounds.x1,
    ...walls.flatMap((wall) => [wall.sourceRect.x0, wall.sourceRect.x1]),
  ]);
  const yLines = uniqueSorted([
    planBounds.top,
    planBounds.bottom,
    ...walls.flatMap((wall) => [wall.sourceRect.top, wall.sourceRect.bottom]),
  ]);
  const minimumArea = document.width * document.height * 0.002;
  return xLines
    .flatMap((x0, column) =>
      yLines.flatMap((top, row) => {
        const x1 = xLines[column + 1];
        const bottom = yLines[row + 1];
        if (x1 === undefined || bottom === undefined) return [];
        const sourcePolygon = [
          { x: x0, y: top },
          { x: x1, y: top },
          { x: x1, y: bottom },
          { x: x0, y: bottom },
        ];
        const center = { x: (x0 + x1) / 2, y: (top + bottom) / 2 };
        if (
          x1 - x0 <= 8 ||
          bottom - top <= 8 ||
          boundingArea(sourcePolygon) < minimumArea ||
          walls.some((wall) => isInsideRectangle(center, wall.sourceRect))
        ) {
          return [];
        }
        return [
          { id: `import-room-grid-${column + 1}-${row + 1}`, name: `חדר ${column + 1}-${row + 1}`, sourcePolygon },
        ];
      }),
    )
    .sort((left, right) => boundingArea(right.sourcePolygon) - boundingArea(left.sourcePolygon))
    .map((room, index) => ({ ...room, id: `import-room-${index + 1}`, name: `חדר ${index + 1}` }));
}

function inferRooms(
  document: PdfVectorDocument,
  walls: readonly ImportWallDraft[],
  planBounds: SourcePdfRect,
): ImportRoomDraft[] {
  if (walls.length < 4) return [];
  const thicknesses = walls.map((wall) =>
    wall.orientation === 'horizontal'
      ? wall.sourceRect.bottom - wall.sourceRect.top
      : wall.sourceRect.x1 - wall.sourceRect.x0,
  );
  const typicalThickness = median(thicknesses);
  const boundsWidth = planBounds.x1 - planBounds.x0;
  const boundsHeight = planBounds.bottom - planBounds.top;
  const padding = typicalThickness * 3;
  const origin = { x: Math.max(0, planBounds.x0 - padding), y: Math.max(0, planBounds.top - padding) };
  const right = Math.min(document.width, planBounds.x1 + padding);
  const bottom = Math.min(document.height, planBounds.bottom + padding);
  const gridWidth = Math.max(1, right - origin.x);
  const gridHeight = Math.max(1, bottom - origin.y);
  const resolutionCellSize = Math.max(0.5, Math.min(typicalThickness / 2, Math.max(boundsWidth, boundsHeight) / 280));
  const budgetCellSize = Math.sqrt((gridWidth * gridHeight) / MAX_GRID_CELLS);
  const cellSize = Math.max(resolutionCellSize, budgetCellSize);
  const columns = Math.max(1, Math.ceil(gridWidth / cellSize));
  const rows = Math.max(1, Math.ceil(gridHeight / cellSize));
  const topologyRectangles = [...walls.map((wall) => wall.sourceRect), ...bridgeTopologyGaps(walls, typicalThickness)];
  const blocked = new Set<string>();
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const center = { x: origin.x + (column + 0.5) * cellSize, y: origin.y + (row + 0.5) * cellSize };
      if (topologyRectangles.some((rectangle) => isInsideRectangle(center, rectangle)))
        blocked.add(cellKey(column, row));
    }
  }

  const outside = new Set<string>();
  const outsideQueue: GridCell[] = [];
  const enqueueOutside = (column: number, row: number) => {
    const key = cellKey(column, row);
    if (column < 0 || column >= columns || row < 0 || row >= rows || blocked.has(key) || outside.has(key)) return;
    outside.add(key);
    outsideQueue.push({ column, row });
  };
  for (let column = 0; column < columns; column += 1) {
    enqueueOutside(column, 0);
    enqueueOutside(column, rows - 1);
  }
  for (let row = 0; row < rows; row += 1) {
    enqueueOutside(0, row);
    enqueueOutside(columns - 1, row);
  }
  for (let index = 0; index < outsideQueue.length; index += 1) {
    const current = outsideQueue[index];
    if (current === undefined) continue;
    for (const direction of DIRECTIONS) enqueueOutside(current.column + direction.column, current.row + direction.row);
  }

  const visited = new Set<string>();
  const components: GridCell[][] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const startKey = cellKey(column, row);
      if (blocked.has(startKey) || outside.has(startKey) || visited.has(startKey)) continue;
      const component: GridCell[] = [];
      const queue: GridCell[] = [{ column, row }];
      visited.add(startKey);
      for (let index = 0; index < queue.length; index += 1) {
        const current = queue[index];
        if (current === undefined) continue;
        component.push(current);
        for (const direction of DIRECTIONS) {
          const nextColumn = current.column + direction.column;
          const nextRow = current.row + direction.row;
          const key = cellKey(nextColumn, nextRow);
          if (
            nextColumn < 0 ||
            nextColumn >= columns ||
            nextRow < 0 ||
            nextRow >= rows ||
            blocked.has(key) ||
            outside.has(key) ||
            visited.has(key)
          ) {
            continue;
          }
          visited.add(key);
          queue.push({ column: nextColumn, row: nextRow });
        }
      }
      if (component.length >= 12) components.push(component);
    }
  }

  const floodRooms = components
    .sort((left, right) => right.length - left.length)
    .map((component, index) => ({
      id: `import-room-${index + 1}`,
      name: `חדר ${index + 1}`,
      sourcePolygon: componentPolygon(component, origin, cellSize),
    }));
  return floodRooms.length > 0 ? floodRooms : inferRoomsFromWallGrid(document, walls, planBounds).slice(0, 16);
}

export function createImportDraft(document: PdfVectorDocument, source: PdfImportSource): PdfImportDraft {
  const wallRectangles = selectPlanWallCluster(
    document.rectangles.filter((rectangle) => isWallCandidate(rectangle, document)),
    document,
  );
  const walls = wallRectangles.map(toWallDraft);
  const planBounds = boundsOf(wallRectangles, document);
  const rooms = inferRooms(document, walls, planBounds);
  const warnings = [
    ...document.warnings,
    ...(walls.length === 0 ? ['לא זוהו מסות קיר וקטוריות'] : []),
    ...(rooms.length === 0 ? ['לא זוהו חללים סגורים; יש להשלים את הגאומטריה ידנית'] : []),
  ];
  return {
    source: { ...source },
    document,
    planBounds,
    walls,
    rooms,
    calibration: null,
    warnings,
  };
}

export function calibrateImportDraft(draft: PdfImportDraft, input: ImportCalibrationInput): PdfImportDraft {
  if (!Number.isFinite(input.lengthMm) || input.lengthMm <= 0) throw new RangeError('מידת הכיול חייבת להיות חיובית');
  const distance = Math.hypot(input.sourceEnd.x - input.sourceStart.x, input.sourceEnd.y - input.sourceStart.y);
  if (!Number.isFinite(distance) || distance <= 0) throw new RangeError('נקודות כיול חייבות להיות שונות זו מזו');
  return {
    ...draft,
    calibration: {
      sourceStart: { ...input.sourceStart },
      sourceEnd: { ...input.sourceEnd },
      lengthMm: input.lengthMm,
      mmPerSourceUnit: input.lengthMm / distance,
    },
  };
}

export function renameImportedRoom(draft: PdfImportDraft, roomId: string, name: string): PdfImportDraft {
  const normalizedName = name.trim();
  if (normalizedName.length === 0) throw new TypeError('שם החדר אינו יכול להיות ריק');
  if (!draft.rooms.some((room) => room.id === roomId)) throw new RangeError('החדר המבוקש לא נמצא בטיוטת הייבוא');
  return {
    ...draft,
    rooms: draft.rooms.map((room) => (room.id === roomId ? { ...room, name: normalizedName } : room)),
  };
}
