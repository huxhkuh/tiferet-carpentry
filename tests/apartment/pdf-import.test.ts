import { describe, expect, it } from 'vitest';
import { analyzeArchitecturalPdf } from '../../src/apartment/import/pdf-import';

function makePdfFile(body: string, name = 'apartment.pdf', type = 'application/pdf'): File {
  return new File([body], name, { type });
}

const vectorPdf = `%PDF-1.7
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 128 >>
stream
0 0 m 240 0 l 240 160 l 0 160 l h S
10 20 180 14 re S
30 40 80 0 l S
BT /F1 12 Tf 44 88 Td (חדר שינה 320/280) Tj ET
endstream
endobj
%%EOF`;

describe('architectural PDF import analysis', () => {
  it('extracts browser-side vector evidence and classifies an import draft', async () => {
    const draft = await analyzeArchitecturalPdf(makePdfFile(vectorPdf));

    expect(draft.status).toBe('draft-ready');
    expect(draft.pageCount).toBe(1);
    expect(draft.streams.total).toBe(1);
    expect(draft.vectorSummary.lineSegments).toBeGreaterThanOrEqual(4);
    expect(draft.vectorSummary.rectangles).toBe(1);
    expect(draft.vectorSummary.textCandidates).toEqual(['חדר שינה 320/280']);
    expect(draft.vectorSummary.dimensionCandidates).toContain('חדר שינה 320/280');
    expect(draft.qualityFlags).toContain('נמצאו וקטורים בסיסיים שמאפשרים טיוטת ייבוא');
  });

  it('rejects files that are not PDFs before reading geometry', async () => {
    await expect(analyzeArchitecturalPdf(makePdfFile('not a pdf', 'notes.txt', 'text/plain'))).rejects.toThrow(
      'בחרו קובץ PDF תקין',
    );
  });
});
