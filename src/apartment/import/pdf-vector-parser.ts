import type { PdfVectorDocument, PdfVectorRectangle } from './types';

const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MAX_STREAMS = 1_000;
const MAX_DECODED_STREAM_BYTES = 50 * 1024 * 1024;
const MAX_TOTAL_DECODED_STREAM_BYTES = 80 * 1024 * 1024;
const MAX_VECTOR_RECTANGLES = 100_000;
const MAX_PAGE_DIMENSION = 50_000;
const latin1 = new TextDecoder('latin1');

type Matrix = readonly [number, number, number, number, number, number];

interface GraphicsState {
  transform: Matrix;
  fillGray: number | null;
  strokeWidth: number;
}

interface PendingRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

function multiplyMatrix(left: Matrix, right: Matrix): Matrix {
  const [a, b, c, d, e, f] = left;
  const [g, h, i, j, k, l] = right;
  return [a * g + c * h, b * g + d * h, a * i + c * j, b * i + d * j, a * k + c * l + e, b * k + d * l + f];
}

function transformPoint(matrix: Matrix, x: number, y: number): { x: number; y: number } {
  return {
    x: matrix[0] * x + matrix[2] * y + matrix[4],
    y: matrix[1] * x + matrix[3] * y + matrix[5],
  };
}

function finiteNumbers(values: readonly number[], expected: number): values is number[] {
  return values.length >= expected && values.slice(-expected).every(Number.isFinite);
}

function lastSixNumbers(values: readonly number[]): Matrix | null {
  if (!finiteNumbers(values, 6)) return null;
  const start = values.length - 6;
  return [
    values[start] ?? 0,
    values[start + 1] ?? 0,
    values[start + 2] ?? 0,
    values[start + 3] ?? 0,
    values[start + 4] ?? 0,
    values[start + 5] ?? 0,
  ];
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function rounded(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function toPageRectangle(
  rectangle: PendingRectangle,
  state: GraphicsState,
  pageHeight: number,
): PdfVectorRectangle | null {
  const points = [
    transformPoint(state.transform, rectangle.x, rectangle.y),
    transformPoint(state.transform, rectangle.x + rectangle.width, rectangle.y),
    transformPoint(state.transform, rectangle.x + rectangle.width, rectangle.y + rectangle.height),
    transformPoint(state.transform, rectangle.x, rectangle.y + rectangle.height),
  ];
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const bottomUpY0 = Math.min(...ys);
  const bottomUpY1 = Math.max(...ys);
  if (![x0, x1, bottomUpY0, bottomUpY1].every(Number.isFinite) || x1 <= x0 || bottomUpY1 <= bottomUpY0) {
    return null;
  }
  return {
    x0: rounded(x0),
    x1: rounded(x1),
    top: rounded(pageHeight - bottomUpY1),
    bottom: rounded(pageHeight - bottomUpY0),
    fillGray: state.fillGray === null ? null : rounded(state.fillGray),
    strokeWidth: rounded(state.strokeWidth),
    source: 'vector',
  };
}

const TOKEN_PATTERN = /[+-]?(?:\d+\.?\d*|\.\d+)|(?:[fBb]\*|cm|rg|RG|re|[qQwgGmlhfFBSsn])\b/g;

function extractRectanglesFromContent(content: string, pageHeight: number): PdfVectorRectangle[] {
  const tokens = content.match(TOKEN_PATTERN) ?? [];
  const operands: number[] = [];
  const states: GraphicsState[] = [];
  let state: GraphicsState = { transform: [1, 0, 0, 1, 0, 0], fillGray: null, strokeWidth: 1 };
  let pending: PendingRectangle[] = [];
  const rectangles: PdfVectorRectangle[] = [];

  const paint = (filled: boolean) => {
    if (filled) {
      for (const rectangle of pending) {
        const converted = toPageRectangle(rectangle, state, pageHeight);
        if (converted !== null) rectangles.push(converted);
      }
    }
    pending = [];
  };

  for (const token of tokens) {
    const numeric = Number(token);
    if (Number.isFinite(numeric)) {
      operands.push(numeric);
      continue;
    }
    if (token === 'q') states.push({ ...state });
    else if (token === 'Q') state = states.pop() ?? state;
    else if (token === 'cm') {
      const matrix = lastSixNumbers(operands);
      if (matrix !== null) state = { ...state, transform: multiplyMatrix(state.transform, matrix) };
    } else if (token === 'w' && finiteNumbers(operands, 1)) state = { ...state, strokeWidth: operands.at(-1) ?? 1 };
    else if (token === 'g' && finiteNumbers(operands, 1)) state = { ...state, fillGray: operands.at(-1) ?? null };
    else if (token === 'rg' && finiteNumbers(operands, 3)) {
      const [red, green, blue] = operands.slice(-3);
      state = {
        ...state,
        fillGray: Math.max(red, green, blue) - Math.min(red, green, blue) < 0.001 ? (red + green + blue) / 3 : null,
      };
    } else if (token === 're' && finiteNumbers(operands, 4)) {
      const [x, y, width, height] = operands.slice(-4);
      pending.push({ x, y, width, height });
    } else if (
      token === 'f' ||
      token === 'F' ||
      token === 'f*' ||
      token === 'B' ||
      token === 'B*' ||
      token === 'b' ||
      token === 'b*'
    ) {
      paint(true);
    } else if (token === 'S' || token === 's') paint(true);
    else if (token === 'n') paint(false);
    operands.length = 0;
  }
  return rectangles;
}

interface PdfPageGeometry {
  sourceWidth: number;
  sourceHeight: number;
  width: number;
  height: number;
  rotation: 0 | 90 | 180 | 270;
}

function parsePageSize(source: string): PdfPageGeometry {
  const mediaBox =
    /\/MediaBox\s*\[\s*([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)\s*\]/.exec(
      source,
    );
  if (mediaBox === null) throw new TypeError('לא נמצאו מידות עמוד בקובץ ה-PDF');
  const [, x0Text, y0Text, x1Text, y1Text] = mediaBox;
  const sourceWidth = Number(x1Text) - Number(x0Text);
  const sourceHeight = Number(y1Text) - Number(y0Text);
  if (
    !Number.isFinite(sourceWidth) ||
    !Number.isFinite(sourceHeight) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0 ||
    sourceWidth > MAX_PAGE_DIMENSION ||
    sourceHeight > MAX_PAGE_DIMENSION
  ) {
    throw new TypeError('מידות עמוד ה-PDF אינן תקינות');
  }
  const rawRotation = Number(/\/Rotate\s+([+-]?\d+)\b/.exec(source)?.[1] ?? 0);
  const normalizedRotation = ((rawRotation % 360) + 360) % 360;
  const rotation =
    normalizedRotation === 90 || normalizedRotation === 180 || normalizedRotation === 270 ? normalizedRotation : 0;
  const swapsAxes = rotation === 90 || rotation === 270;
  return {
    sourceWidth,
    sourceHeight,
    width: swapsAxes ? sourceHeight : sourceWidth,
    height: swapsAxes ? sourceWidth : sourceHeight,
    rotation,
  };
}

function rotateRectangle(rectangle: PdfVectorRectangle, page: PdfPageGeometry): PdfVectorRectangle {
  if (page.rotation === 0) return rectangle;
  if (page.rotation === 90) {
    return {
      ...rectangle,
      x0: rounded(page.sourceHeight - rectangle.bottom),
      x1: rounded(page.sourceHeight - rectangle.top),
      top: rectangle.x0,
      bottom: rectangle.x1,
    };
  }
  if (page.rotation === 180) {
    return {
      ...rectangle,
      x0: rounded(page.sourceWidth - rectangle.x1),
      x1: rounded(page.sourceWidth - rectangle.x0),
      top: rounded(page.sourceHeight - rectangle.bottom),
      bottom: rounded(page.sourceHeight - rectangle.top),
    };
  }
  return {
    ...rectangle,
    x0: rectangle.top,
    x1: rectangle.bottom,
    top: rounded(page.sourceWidth - rectangle.x1),
    bottom: rounded(page.sourceWidth - rectangle.x0),
  };
}

interface RawPdfStream {
  dictionary: string;
  bytes: Uint8Array;
}

function extractStreams(bytes: Uint8Array, source: string): RawPdfStream[] {
  const streams: RawPdfStream[] = [];
  const marker = /stream\r?\n/g;
  for (let match = marker.exec(source); match !== null && streams.length < MAX_STREAMS; match = marker.exec(source)) {
    const contentStart = match.index + match[0].length;
    const dictionaryStart = source.lastIndexOf('<<', match.index);
    const dictionaryEnd = source.lastIndexOf('>>', match.index);
    if (dictionaryStart < 0 || dictionaryEnd < dictionaryStart) continue;
    const dictionary = source.slice(dictionaryStart, dictionaryEnd + 2);
    const hasIndirectLength = /\/Length\s+\d+\s+\d+\s+R\b/.test(dictionary);
    const directLength = hasIndirectLength ? null : /\/Length\s+(\d+)\b/.exec(dictionary);
    const declaredLength = directLength === null ? null : Number(directLength[1]);
    const fallbackEnd = source.indexOf('endstream', contentStart);
    const contentEnd = declaredLength === null ? fallbackEnd : contentStart + declaredLength;
    if (contentEnd < contentStart || contentEnd > bytes.length) continue;
    streams.push({ dictionary, bytes: bytes.slice(contentStart, contentEnd) });
    marker.lastIndex = Math.max(marker.lastIndex, contentEnd);
  }
  return streams;
}

async function decodeStream(stream: RawPdfStream): Promise<Uint8Array | null> {
  if (!/\/Filter\b/.test(stream.dictionary)) return stream.bytes;
  if (!/\/FlateDecode\b/.test(stream.dictionary) || typeof DecompressionStream === 'undefined') return null;
  const inflate = async (bytes: Uint8Array): Promise<Uint8Array | null> => {
    try {
      const source = new ReadableStream<ArrayBuffer>({
        start(controller) {
          controller.enqueue(toArrayBuffer(bytes));
          controller.close();
        },
      });
      const reader = source.pipeThrough(new DecompressionStream('deflate')).getReader();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        const chunk = result.value;
        totalBytes += chunk.byteLength;
        if (totalBytes > MAX_DECODED_STREAM_BYTES) {
          await reader.cancel();
          return null;
        }
        chunks.push(chunk);
      }
      const output = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        output.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return output;
    } catch {
      return null;
    }
  };
  const direct = await inflate(stream.bytes);
  if (direct !== null) return direct;
  let trimmedLength = stream.bytes.length;
  while (trimmedLength > 0 && (stream.bytes[trimmedLength - 1] === 10 || stream.bytes[trimmedLength - 1] === 13)) {
    trimmedLength -= 1;
  }
  if (trimmedLength === stream.bytes.length) return null;
  try {
    return await inflate(stream.bytes.slice(0, trimmedLength));
  } catch {
    return null;
  }
}

function uniqueRectangles(rectangles: readonly PdfVectorRectangle[]): PdfVectorRectangle[] {
  const byGeometry = new Map<string, PdfVectorRectangle>();
  for (const rectangle of rectangles) {
    const key = `${rectangle.x0}:${rectangle.top}:${rectangle.x1}:${rectangle.bottom}:${rectangle.fillGray}`;
    byGeometry.set(key, rectangle);
  }
  return [...byGeometry.values()].sort((left, right) => left.top - right.top || left.x0 - right.x0);
}

export async function parsePdfVectorDocument(bytes: Uint8Array): Promise<PdfVectorDocument> {
  if (bytes.byteLength > MAX_PDF_BYTES) throw new RangeError('ניתן לייבא קובצי PDF בגודל של עד 20MB');
  if (bytes.byteLength < 8 || latin1.decode(bytes.slice(0, 8)).startsWith('%PDF-') === false) {
    throw new TypeError('יש לבחור קובץ PDF תקין');
  }
  const source = latin1.decode(bytes);
  const page = parsePageSize(source);
  const pageMatches = source.match(/\/Type\s*\/Page\b/g);
  const declaredPageCount = /\/Count\s+(?<pageCount>\d+)\b/.exec(source);
  const pageCount = pageMatches?.length ?? Number(declaredPageCount?.groups?.pageCount ?? 1);
  const streams = extractStreams(bytes, source);
  const extractedRectangles: PdfVectorRectangle[] = [];
  let skippedStreams = 0;
  let totalDecodedBytes = 0;
  let budgetExceeded = false;
  for (const stream of streams) {
    const content = await decodeStream(stream);
    if (content === null) {
      skippedStreams += 1;
      continue;
    }
    if (totalDecodedBytes + content.byteLength > MAX_TOTAL_DECODED_STREAM_BYTES) {
      budgetExceeded = true;
      break;
    }
    totalDecodedBytes += content.byteLength;
    extractedRectangles.push(
      ...extractRectanglesFromContent(latin1.decode(content), page.sourceHeight).map((rectangle) =>
        rotateRectangle(rectangle, page),
      ),
    );
    if (extractedRectangles.length > MAX_VECTOR_RECTANGLES) {
      budgetExceeded = true;
      break;
    }
  }
  const rectangles = uniqueRectangles(extractedRectangles.slice(0, MAX_VECTOR_RECTANGLES));
  const scaleMatch = /\b1\s*:\s*(?<scale>20|25|50|75|100|125|200)\b/.exec(source);
  const scale = scaleMatch?.groups?.scale === undefined ? null : `1:${scaleMatch.groups.scale}`;
  const warnings: string[] = [];
  if (pageCount > 1) warnings.push('בשלב זה מיובא העמוד הראשון בלבד');
  if (skippedStreams > 0) warnings.push(`${skippedStreams} זרמי PDF לא נתמכו ולא נותחו`);
  if (budgetExceeded) warnings.push('ניתוח ה-PDF נעצר בגבול הזיכרון הבטוח; יש לאמת שהגאומטריה מלאה');
  if (rectangles.length === 0) warnings.push('לא נמצאה גאומטריה וקטורית; ייתכן שזהו מסמך סרוק');
  return { pageCount, width: page.width, height: page.height, rectangles, detectedScale: scale, warnings };
}
