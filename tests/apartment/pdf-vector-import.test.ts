import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parsePdfVectorDocument } from '../../src/apartment/import/pdf-vector-parser';
import { calibrateImportDraft, createImportDraft } from '../../src/apartment/import/geometry';
import { buildApartmentFromImport } from '../../src/apartment/import/model';
import { validateApartment } from '../../src/apartment/validation/apartment';

const encoder = new TextEncoder();

function plainPdf(content: string): Uint8Array {
  const stream = encoder.encode(content);
  return encoder.encode(
    `%PDF-1.4\n1 0 obj\n<</Type /Page /MediaBox [0 0 600 400] /Contents 2 0 R>>\nendobj\n2 0 obj\n<</Length ${stream.length}>>\nstream\n${content}\nendstream\nendobj\n%%EOF`,
  );
}

async function compressedPdf(content: string): Promise<Uint8Array> {
  const encoded = encoder.encode(content);
  const buffer = new ArrayBuffer(encoded.byteLength);
  new Uint8Array(buffer).set(encoded);
  const source = new ReadableStream<ArrayBuffer>({
    start(controller) {
      controller.enqueue(buffer);
      controller.close();
    },
  });
  const compressed = await new Response(source.pipeThrough(new CompressionStream('deflate'))).arrayBuffer();
  const before = encoder.encode(
    `%PDF-1.7\n1 0 obj\n<</Type /Page /MediaBox [0 0 600 400] /Contents 2 0 R>>\nendobj\n2 0 obj\n<</Length ${compressed.byteLength} /Filter /FlateDecode>>\nstream\n`,
  );
  const after = encoder.encode('\nendstream\nendobj\n%%EOF');
  const bytes = new Uint8Array(before.length + compressed.byteLength + after.length);
  bytes.set(before);
  bytes.set(new Uint8Array(compressed), before.length);
  bytes.set(after, before.length + compressed.byteLength);
  return bytes;
}

const ROOM_WALLS = [
  'q',
  '0.5 g',
  '20 370 560 10 re f',
  '20 20 560 10 re f',
  '20 20 10 360 re f',
  '570 20 10 360 re f',
  'Q',
].join('\n');

describe('browser PDF vector import', () => {
  it('extracts filled wall rectangles into a top-left page coordinate system', async () => {
    const document = await parsePdfVectorDocument(plainPdf(ROOM_WALLS));

    expect(document).toMatchObject({ pageCount: 1, width: 600, height: 400 });
    expect(document.rectangles).toHaveLength(4);
    expect(document.rectangles[0]).toMatchObject({ x0: 20, top: 20, x1: 580, bottom: 30, fillGray: 0.5 });
    expect(document.warnings).toEqual([]);
  });

  it('decodes Flate-compressed content streams without adding a production dependency', async () => {
    const document = await parsePdfVectorDocument(await compressedPdf(ROOM_WALLS));

    expect(document.rectangles).toHaveLength(4);
    expect(document.rectangles.every((rectangle) => rectangle.source === 'vector')).toBe(true);
  });

  it('keeps stroked architectural rectangles as vector evidence', async () => {
    const strokedWalls = ROOM_WALLS.replace('0.5 g', '1 w').replaceAll(' re f', ' re S');
    const document = await parsePdfVectorDocument(plainPdf(strokedWalls));

    expect(document.rectangles).toHaveLength(4);
  });

  it('rejects invalid or oversized uploads before parsing streams', async () => {
    await expect(parsePdfVectorDocument(encoder.encode('not a pdf'))).rejects.toThrow('קובץ PDF תקין');
    await expect(parsePdfVectorDocument(new Uint8Array(20 * 1024 * 1024 + 1))).rejects.toThrow('20MB');
    await expect(
      parsePdfVectorDocument(
        encoder.encode('%PDF-1.4\n1 0 obj\n<</Type /Page /MediaBox [0 0 999999 999999]>>\nendobj\n%%EOF'),
      ),
    ).rejects.toThrow('מידות עמוד');
  });

  it('extracts vector rectangles from the supplied Tiferet source PDF', async () => {
    const bytes = readFileSync(resolve('public/tiferet/sheet-5-1-original.pdf'));
    const document = await parsePdfVectorDocument(bytes);

    expect(document).toMatchObject({ pageCount: 1, width: 2268, height: 1193 });
    expect(document.rectangles.length).toBeGreaterThan(100);
    expect(document.warnings).not.toContain('לא נמצאה גאומטריה וקטורית; ייתכן שזהו מסמך סרוק');
    const draft = createImportDraft(document, {
      fileName: 'sheet-5-1-original.pdf',
      fileSizeBytes: bytes.byteLength,
      sourceId: 'tiferet-5-1-source',
    });
    expect(draft.walls.length).toBeGreaterThan(20);
    expect(draft.rooms.length).toBeGreaterThan(2);
    const calibrated = calibrateImportDraft(draft, {
      sourceStart: { x: draft.planBounds.x0, y: draft.planBounds.top },
      sourceEnd: { x: draft.planBounds.x1, y: draft.planBounds.top },
      lengthMm: 5_650,
    });
    const apartment = buildApartmentFromImport(calibrated, {
      apartmentName: 'בדיקת תוכנית 5-1',
      buildingName: 'תכלת',
      floor: 5,
      sheet: '5-1-test',
    });
    expect(validateApartment(apartment)).toBe(true);
    expect(apartment.rooms.every((room) => room.wallIds.length >= 2)).toBe(true);
    expect(Math.max(...apartment.rooms.map((room) => room.wallIds.length))).toBeLessThanOrEqual(4);
  });
});
