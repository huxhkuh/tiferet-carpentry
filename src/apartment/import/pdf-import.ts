import { readPdfContentStreams } from './pdf-vector-parser';
type ArchitecturalPdfImportStatus = 'draft-ready' | 'needs-vector-pdf' | 'needs-manual-review';

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

interface ContentAnalysis {
  lineSegments: number;
  rectangles: number;
  curves: number;
  textCandidates: string[];
}

const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MAX_TEXT_CANDIDATES = 24;
const TEXT_PATTERN = /\(([^)]{1,120})\)\s*Tj/g;
const DIMENSION_PATTERN = /\b\d{2,4}\s*[/:x×]\s*\d{2,4}\b|\d{2,4}\s*ס[״"]?מ/i;

const isPdfFile = (file: File): boolean => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

const uniqueLimited = (values: readonly string[], limit: number): string[] =>
  [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].slice(0, limit);

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

  const decoded = await readPdfContentStreams(new Uint8Array(await file.arrayBuffer()));
  const textDecoder = new TextDecoder('utf-8');
  const analysis = mergeAnalyses(decoded.contents.map((content) => analyzeContentStream(textDecoder.decode(content))));
  const status = classifyStatus(analysis);
  const dimensionCandidates = analysis.textCandidates.filter((text) => DIMENSION_PATTERN.test(text));

  return {
    schemaVersion: 1,
    fileName: file.name,
    fileSizeBytes: file.size,
    generatedAt: new Date().toISOString(),
    status,
    pageCount: decoded.pageCount,
    streams: {
      total: decoded.total,
      decoded: decoded.contents.length,
      compressed: decoded.compressed,
      skippedCompressed: decoded.skipped,
    },
    vectorSummary: {
      lineSegments: analysis.lineSegments,
      rectangles: analysis.rectangles,
      curves: analysis.curves,
      wallCandidates: Math.floor((analysis.lineSegments + analysis.rectangles * 4) / 4),
      textCandidates: analysis.textCandidates,
      dimensionCandidates,
    },
    qualityFlags: [
      ...qualityFlags(status, decoded.total, decoded.skipped),
      ...(decoded.budgetExceeded ? ['הניתוח נעצר בגבול הזיכרון; הגאומטריה חלקית'] : []),
    ],
  };
}
