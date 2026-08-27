import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

interface VectorPageEvidence {
  page: number;
  widthPoints: number;
  heightPoints: number;
  characterCount: number;
  wordCount: number;
  lineCount: number;
  rectangleCount: number;
  curveCount: number;
  imageCount: number;
  wallMassCandidateCount: number;
  planBoundsPoints: { x0: number; top: number; x1: number; bottom: number } | null;
}

interface VectorDocumentEvidence {
  driveFileId: string;
  sourceSizeBytes: number;
  sourceSha256: string;
  pageCount: number;
  geometryFingerprint: string;
  wallMassFingerprint: string;
  mirroredWallMassFingerprint: string;
  mirroredCandidateIds: string[];
  pages: VectorPageEvidence[];
}

interface VectorEvidenceCatalog {
  schemaVersion: 1;
  extractionMethod: 'pdfplumber-vector-and-positioned-text';
  validatedSourcePdfCount: number;
  validatedSourceBytes: number;
  documents: VectorDocumentEvidence[];
}

const loadEvidence = (): VectorEvidenceCatalog =>
  JSON.parse(
    readFileSync(resolve(process.cwd(), 'public/tiferet/catalog/vector-evidence.json'), 'utf8'),
  ) as VectorEvidenceCatalog;

describe('Tiferet raw vector evidence', () => {
  it('contains only byte-validated source PDFs and preserves one record per available apartment plan', () => {
    const evidence = loadEvidence();

    expect(evidence).toMatchObject({
      schemaVersion: 1,
      extractionMethod: 'pdfplumber-vector-and-positioned-text',
      validatedSourcePdfCount: 48,
      validatedSourceBytes: 6_586_021,
    });
    expect(evidence.documents).toHaveLength(48);
    expect(new Set(evidence.documents.map((document) => document.driveFileId)).size).toBe(48);
    expect(evidence.documents.every((document) => document.pages.length === document.pageCount)).toBe(true);
    expect(
      evidence.documents.every((document) =>
        document.pages.every(
          (page) =>
            page.page > 0 &&
            page.widthPoints > 0 &&
            page.heightPoints > 0 &&
            page.characterCount > 0 &&
            page.wordCount > 0 &&
            page.lineCount >= 0 &&
            page.rectangleCount >= 0 &&
            page.curveCount >= 0 &&
            page.imageCount >= 0,
        ),
      ),
    ).toBe(true);
  });

  it('reproduces the independently inspected 5-1 PDF metrics and hash', () => {
    const source = loadEvidence().documents.find(
      (document) => document.driveFileId === '1RTrFsQ1eBTVzudl3wC0Ocv5DirPh6tBq',
    );

    expect(source).toMatchObject({
      sourceSizeBytes: 127_934,
      sourceSha256: '2165ed6217a04a5a56ac00b5b3dbf0ac477f6224884cfd1a513fcf6b478f6dbe',
      pageCount: 1,
      pages: [
        {
          page: 1,
          widthPoints: 2_268,
          heightPoints: 1_193,
          characterCount: 6_243,
          lineCount: 4_027,
          rectangleCount: 392,
          curveCount: 20,
          wallMassCandidateCount: 48,
          planBoundsPoints: { x0: 610.92, top: 378.84, x1: 1_192.08, bottom: 991.2 },
        },
      ],
    });
    expect(source?.geometryFingerprint).toMatch(/^[a-f0-9]{64}$/u);
    expect(source?.wallMassFingerprint).toMatch(/^[a-f0-9]{64}$/u);
    expect(source?.mirroredWallMassFingerprint).toMatch(/^[a-f0-9]{64}$/u);
  });

  it('extracts structural wall-mass candidates deterministically for another independent sheet', () => {
    const source = loadEvidence().documents.find(
      (document) => document.driveFileId === '1dcjFOLEhadppP1e7vlhQDAs-jd6yb9JI',
    );

    expect(source?.pages[0]).toMatchObject({
      wallMassCandidateCount: 35,
      planBoundsPoints: { x0: 517.92, top: 241.8, x1: 1_104.72, bottom: 826.32 },
    });
  });

  it('keeps each byte-validated PDF as an exact full-source asset for the planner', () => {
    const evidence = loadEvidence();

    for (const document of evidence.documents) {
      const sourceBytes = readFileSync(
        resolve(process.cwd(), 'public/tiferet/source-pdfs', `${document.driveFileId}.pdf`),
      );
      expect(sourceBytes).toHaveLength(document.sourceSizeBytes);
      expect(createHash('sha256').update(sourceBytes).digest('hex')).toBe(document.sourceSha256);
    }
  });
});
