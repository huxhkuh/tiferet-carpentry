export type ArchitecturalPdfImportStatus = 'draft-ready' | 'needs-vector-pdf' | 'needs-manual-review';

export interface ArchitecturalPdfImportDraft {
  schemaVersion: 1;
  fileName: string;
  fileSizeBytes: number;
  generatedAt: string;
  status: ArchitecturalPdfImportStatus;
  pageCount: number;
  streams: {
    total: number;
    decoded: number;
    compressed: number;
    skippedCompressed: number;
  };
  vectorSummary: {
    lineSegments: number;
    rectangles: number;
    curves: number;
    wallCandidates: number;
    textCandidates: string[];
    dimensionCandidates: string[];
  };
  qualityFlags: string[];
}

interface PdfStreamSlice {
  dictionary: string;
  content: string;
}

interface ContentAnalysis {
  lineSegments: number;
  rectangles: number;
  curves: number;
  textCandidates: string[];
}

const MAX_PDF_BYTES = 25 * 1024 * 1024;
const MAX_TEXT_CANDIDATES = 24;
const PDF_HEADER_PREFIX = '%PDF-';
const TEXT_PATTERN = /\(([^)]{1,120})\)\s*Tj/g;
const DIMENSION_PATTERN = /\b\d{2,4}\s*[/:x×]\s*\d{2,4}\b|\d{2,4}\s*ס[״"]?מ/i;

const isPdfFile = (file: File): boolean => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

const uniqueLimited = (values: readonly string[], limit: number): string[] =>
  [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].slice(0, limit);

const decodeUtf8 = (bytes: ArrayBuffer | Uint8Array): string => new TextDecoder('utf-8').decode(bytes);

const countPages = (source: string): number => {
  const matches = source.match(/\/Type\s*\/Page\b/g);
  return matches?.length ?? 0;
};

function extractStreams(source: string): PdfStreamSlice[] {
  const streams: PdfStreamSlice[] = [];
  let searchStart = 0;
  for (
    let markerIndex = source.indexOf('stream', searchStart);
    markerIndex >= 0;
    markerIndex = source.indexOf('stream', searchStart)
  ) {
    const dictionaryStart = source.lastIndexOf('<<', markerIndex);
    const dictionaryEnd = source.lastIndexOf('>>', markerIndex);
    const endIndex = source.indexOf('endstream', markerIndex);
    if (dictionaryStart >= 0 && dictionaryEnd > dictionaryStart && endIndex > markerIndex) {
      const lineBreakSize =
        source.slice(markerIndex + 'stream'.length, markerIndex + 'stream'.length + 2) === '\r\n' ? 2 : 1;
      const contentStart = markerIndex + 'stream'.length + lineBreakSize;
      streams.push({
        dictionary: source.slice(dictionaryStart, dictionaryEnd + 2),
        content: source.slice(contentStart, endIndex).replace(/\r?\n$/, ''),
      });
    }
    searchStart = endIndex > markerIndex ? endIndex + 'endstream'.length : markerIndex + 'stream'.length;
  }
  return streams;
}

function stringToBytes(content: string): Uint8Array {
  return Uint8Array.from(content, (char) => char.charCodeAt(0) & 0xff);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function inflatePdfStream(content: string): Promise<string | null> {
  if (typeof DecompressionStream !== 'function') return null;
  try {
    const stream = new Blob([toArrayBuffer(stringToBytes(content))])
      .stream()
      .pipeThrough(new DecompressionStream('deflate'));
    const inflated = await new Response(stream).arrayBuffer();
    return decodeUtf8(inflated);
  } catch {
    return null;
  }
}

async function decodeStreams(streams: readonly PdfStreamSlice[]): Promise<{
  decodedContents: string[];
  compressed: number;
  skippedCompressed: number;
}> {
  const decoded = await Promise.all(
    streams.map(async (stream) => {
      if (!/\/FlateDecode\b/.test(stream.dictionary)) return { content: stream.content, compressed: false };
      const inflated = await inflatePdfStream(stream.content);
      return { content: inflated, compressed: true };
    }),
  );
  return {
    decodedContents: decoded.flatMap((item) => (item.content === null ? [] : [item.content])),
    compressed: decoded.filter((item) => item.compressed).length,
    skippedCompressed: decoded.filter((item) => item.compressed && item.content === null).length,
  };
}

function extractTextCandidates(content: string): string[] {
  return uniqueLimited(
    [...content.matchAll(TEXT_PATTERN)].map((match) => match[1] ?? ''),
    MAX_TEXT_CANDIDATES,
  );
}

function analyzeContentStream(content: string): ContentAnalysis {
  return {
    lineSegments: (content.match(/\s+l\b/g) ?? []).length,
    rectangles: (content.match(/\s+re\b/g) ?? []).length,
    curves: (content.match(/\s+c\b/g) ?? []).length,
    textCandidates: extractTextCandidates(content),
  };
}

function mergeAnalyses(analyses: readonly ContentAnalysis[]): ContentAnalysis {
  return analyses.reduce<ContentAnalysis>(
    (merged, analysis) => ({
      lineSegments: merged.lineSegments + analysis.lineSegments,
      rectangles: merged.rectangles + analysis.rectangles,
      curves: merged.curves + analysis.curves,
      textCandidates: uniqueLimited([...merged.textCandidates, ...analysis.textCandidates], MAX_TEXT_CANDIDATES),
    }),
    { lineSegments: 0, rectangles: 0, curves: 0, textCandidates: [] },
  );
}

function classifyStatus(analysis: ContentAnalysis): ArchitecturalPdfImportStatus {
  if (analysis.lineSegments + analysis.rectangles >= 3) return 'draft-ready';
  if (analysis.textCandidates.length > 0 || analysis.curves > 0) return 'needs-manual-review';
  return 'needs-vector-pdf';
}

function qualityFlags(status: ArchitecturalPdfImportStatus, streams: number, skippedCompressed: number): string[] {
  const vectorFlag =
    status === 'draft-ready'
      ? 'נמצאו וקטורים בסיסיים שמאפשרים טיוטת ייבוא'
      : 'לא נמצאה גאומטריה וקטורית מספקת ליצירת טיוטה';
  const streamFlag = streams === 0 ? ['לא נמצאו stream-ים לניתוח בתוך ה-PDF'] : [];
  const compressionFlag = skippedCompressed > 0 ? [`${skippedCompressed} stream-ים דחוסים לא נפתחו בדפדפן הזה`] : [];
  return [vectorFlag, ...streamFlag, ...compressionFlag];
}

export async function analyzeArchitecturalPdf(file: File): Promise<ArchitecturalPdfImportDraft> {
  if (!isPdfFile(file)) throw new TypeError('בחרו קובץ PDF תקין');
  if (file.size > MAX_PDF_BYTES) throw new RangeError('קובץ ה-PDF גדול מדי לייבוא בדפדפן');

  const bytes = await file.arrayBuffer();
  const source = decodeUtf8(bytes);
  if (!source.startsWith(PDF_HEADER_PREFIX)) throw new TypeError('בחרו קובץ PDF תקין');

  const streams = extractStreams(source);
  const decoded = await decodeStreams(streams);
  const analysis = mergeAnalyses(decoded.decodedContents.map(analyzeContentStream));
  const status = classifyStatus(analysis);
  const dimensionCandidates = analysis.textCandidates.filter((text) => DIMENSION_PATTERN.test(text));

  return {
    schemaVersion: 1,
    fileName: file.name,
    fileSizeBytes: file.size,
    generatedAt: new Date().toISOString(),
    status,
    pageCount: countPages(source),
    streams: {
      total: streams.length,
      decoded: decoded.decodedContents.length,
      compressed: decoded.compressed,
      skippedCompressed: decoded.skippedCompressed,
    },
    vectorSummary: {
      lineSegments: analysis.lineSegments,
      rectangles: analysis.rectangles,
      curves: analysis.curves,
      wallCandidates: Math.floor((analysis.lineSegments + analysis.rectangles * 4) / 4),
      textCandidates: analysis.textCandidates,
      dimensionCandidates,
    },
    qualityFlags: qualityFlags(status, streams.length, decoded.skippedCompressed),
  };
}
