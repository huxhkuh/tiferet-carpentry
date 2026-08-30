import { describe, expect, it } from 'vitest';
import { calibrateImportDraft, createImportDraft, renameImportedRoom } from '../../src/apartment/import/geometry';
import { buildApartmentFromImport } from '../../src/apartment/import/model';
import { parsePdfVectorDocument } from '../../src/apartment/import/pdf-vector-parser';
import { validateApartment } from '../../src/apartment/validation/apartment';

const encoder = new TextEncoder();

function oneRoomPdf(): Uint8Array {
  const content = [
    'q',
    '0.5 g',
    '20 370 560 10 re f',
    '20 20 560 10 re f',
    '20 20 10 360 re f',
    '570 20 10 360 re f',
    'Q',
  ].join('\n');
  return encoder.encode(
    `%PDF-1.4\n1 0 obj\n<</Type /Page /MediaBox [0 0 600 400]>>\nendobj\n2 0 obj\n<</Length ${content.length}>>\nstream\n${content}\nendstream\nendobj\n%%EOF`,
  );
}

function lShapedRoomPdf(): Uint8Array {
  const content = [
    'q',
    '0.5 g',
    '20 370 560 10 re f',
    '570 190 10 190 re f',
    '310 190 270 10 re f',
    '310 20 10 180 re f',
    '20 20 300 10 re f',
    '20 20 10 360 re f',
    'Q',
  ].join('\n');
  return encoder.encode(
    `%PDF-1.4\n1 0 obj\n<</Type /Page /MediaBox [0 0 600 400]>>\nendobj\n2 0 obj\n<</Length ${content.length}>>\nstream\n${content}\nendstream\nendobj\n%%EOF`,
  );
}

describe('architectural PDF import draft', () => {
  it('turns wall masses into an enclosed room draft', async () => {
    const document = await parsePdfVectorDocument(oneRoomPdf());
    const draft = createImportDraft(document, {
      fileName: 'sample-plan.pdf',
      fileSizeBytes: oneRoomPdf().byteLength,
      sourceId: 'sample-source',
    });

    expect(draft.walls).toHaveLength(4);
    expect(draft.rooms).toHaveLength(1);
    expect(draft.rooms[0]?.sourcePolygon.length).toBeGreaterThanOrEqual(4);
    expect(draft.calibration).toBeNull();
  });

  it('preserves a concave room boundary instead of replacing it with a bounding rectangle', async () => {
    const document = await parsePdfVectorDocument(lShapedRoomPdf());
    const draft = createImportDraft(document, {
      fileName: 'l-room.pdf',
      fileSizeBytes: lShapedRoomPdf().byteLength,
      sourceId: 'l-room-source',
    });

    expect(draft.rooms.some((room) => room.sourcePolygon.length > 4)).toBe(true);
  });

  it('calibrates source coordinates from a known written dimension and builds a valid apartment', async () => {
    const document = await parsePdfVectorDocument(oneRoomPdf());
    const draft = createImportDraft(document, {
      fileName: 'sample-plan.pdf',
      fileSizeBytes: oneRoomPdf().byteLength,
      sourceId: 'sample-source',
    });
    const calibrated = calibrateImportDraft(draft, {
      sourceStart: { x: 20, y: 20 },
      sourceEnd: { x: 580, y: 20 },
      lengthMm: 5_600,
    });
    const named = renameImportedRoom(calibrated, calibrated.rooms[0]!.id, 'חדר שינה');
    const apartment = buildApartmentFromImport(named, {
      apartmentName: 'דירת בדיקה',
      buildingName: 'בניין א',
      floor: 2,
      sheet: 'A-2',
    });

    expect(named).not.toBe(calibrated);
    expect(calibrated.rooms[0]?.name).toBe('חדר 1');
    expect(named.calibration?.mmPerSourceUnit).toBe(10);
    expect(apartment.rooms[0]?.name).toBe('חדר שינה');
    expect(apartment.wallMasses).toHaveLength(4);
    expect(apartment.source).toMatchObject({
      modelingMethod: 'semi-automatic',
      geometryStatus: 'partially-modeled',
      mathematicalVerification: 'pending',
      visualVerification: 'pending',
    });
    expect(apartment.source.unresolvedFields).toEqual(
      expect.arrayContaining(['opening-verification', 'fixture-verification', 'ceiling-height']),
    );
    expect(validateApartment(apartment)).toBe(true);
  });

  it('rejects zero-length or non-positive calibration measurements', async () => {
    const draft = createImportDraft(await parsePdfVectorDocument(oneRoomPdf()), {
      fileName: 'sample-plan.pdf',
      fileSizeBytes: oneRoomPdf().byteLength,
      sourceId: 'sample-source',
    });

    expect(() =>
      calibrateImportDraft(draft, {
        sourceStart: { x: 20, y: 20 },
        sourceEnd: { x: 20, y: 20 },
        lengthMm: 1_000,
      }),
    ).toThrow('נקודות כיול');
    expect(() =>
      calibrateImportDraft(draft, {
        sourceStart: { x: 20, y: 20 },
        sourceEnd: { x: 580, y: 20 },
        lengthMm: 0,
      }),
    ).toThrow('מידת הכיול');
  });
});
