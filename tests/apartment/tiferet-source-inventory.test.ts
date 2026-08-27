import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getImplementedApartmentSourcePlans,
  getSourceInventorySummary,
  TIFERET_SOURCE_INVENTORY,
} from '../../src/apartment/data/tiferet-source-inventory';

interface SourceCatalogDocument {
  driveFileId: string;
  title: string;
  path: string;
  driveUrl: string;
  mimeType: 'application/pdf';
  sizeBytes: number;
  collection:
    | 'techelet-apartment'
    | 'argaman-apartment'
    | 'techelet-floor'
    | 'argaman-floor'
    | 'ground-apartment'
    | 'ground-context';
  documentRole: 'apartment-plan' | 'floor-plan' | 'ground-plan' | 'ground-context';
  extractionStatus: 'not-extracted' | 'text-extracted' | 'vector-extracted';
  geometryStatus: 'unresolved' | 'partially-modeled' | 'modeled';
  mathematicalVerification: 'pending' | 'passed';
  visualVerification: 'pending' | 'passed';
  unresolvedReason: string;
}

interface SourceCatalog {
  schemaVersion: 1;
  sourceRootId: string;
  sourceRootUrl: string;
  totalBytes: number;
  documents: SourceCatalogDocument[];
}

interface TextEvidenceRecord {
  driveFileId: string;
  sourcePath: string;
  extractionStatus: 'text-extracted';
  textLength: number;
  lineCount: number;
  dimensionLabelsCm: number[];
  roomLabels: string[];
  verticalAnnotationCandidates: string[];
  candidateGeometryGroupId: string | null;
  equivalenceStatus: 'unproven';
}

interface TextEvidenceCatalog {
  schemaVersion: 1;
  extractionMethod: 'google-drive-readable-text';
  records: TextEvidenceRecord[];
}

interface TitleBlockEvidenceRecord {
  driveFileId: string;
  sourcePath: string;
  sheet: string;
  floorFromSourceFolder: number;
  floorPrinted: string | null;
  apartmentNumber: string;
  roomCount: number;
  areaSqm: number;
  edition: number | null;
  coveredBalconySqm: number | null;
  sukkahBalconySqm: number | null;
  date: string;
  buildingType: string;
  scale: string;
  derivation: string;
  unresolvedFields: string[];
}

interface TitleBlockEvidenceCatalog {
  schemaVersion: 1;
  records: TitleBlockEvidenceRecord[];
}

function loadSourceCatalog(): SourceCatalog {
  return JSON.parse(
    readFileSync(resolve('public', 'tiferet', 'catalog', 'source-inventory.json'), 'utf8'),
  ) as SourceCatalog;
}

function loadTextEvidenceCatalog(): TextEvidenceCatalog {
  return JSON.parse(
    readFileSync(resolve('public', 'tiferet', 'catalog', 'text-evidence.json'), 'utf8'),
  ) as TextEvidenceCatalog;
}

function loadTitleBlockEvidenceCatalog(): TitleBlockEvidenceCatalog {
  return JSON.parse(
    readFileSync(resolve('public', 'tiferet', 'catalog', 'titleblock-evidence.json'), 'utf8'),
  ) as TitleBlockEvidenceCatalog;
}

describe('Tiferet source plan inventory', () => {
  it('records the Drive inventory by source collection without treating unresolved plans as clean models', () => {
    const summary = getSourceInventorySummary(TIFERET_SOURCE_INVENTORY);

    expect(summary).toEqual({
      argamanApartmentPlans: 36,
      argamanFloorSheets: 12,
      groundAndGardenPlans: 56,
      techeletApartmentPlans: 63,
      techeletFloorSheets: 12,
      totalSourcePdfs: 179,
    });
  });

  it('preserves traceable Drive metadata without overstating the Techelet 5-1 audit status', () => {
    const implemented = getImplementedApartmentSourcePlans(TIFERET_SOURCE_INVENTORY);

    expect(implemented).toEqual([
      expect.objectContaining({
        buildingId: 'techelet',
        floor: 5,
        sheet: '5-1',
        fileId: '1RTrFsQ1eBTVzudl3wC0Ocv5DirPh6tBq',
        modelStatus: 'partially-modeled',
      }),
    ]);
  });

  it('links every apartment-plan record to the exact inventoried Drive document', () => {
    const sourceApartmentDocuments = loadSourceCatalog().documents.filter(
      (document) => document.documentRole === 'apartment-plan',
    );
    const catalogIds = new Set(sourceApartmentDocuments.map((document) => document.driveFileId));
    const planIds = new Set(TIFERET_SOURCE_INVENTORY.apartmentPlans.map((plan) => plan.fileId));

    expect(TIFERET_SOURCE_INVENTORY.apartmentPlans).toHaveLength(99);
    expect(planIds).toEqual(catalogIds);
    expect(
      TIFERET_SOURCE_INVENTORY.apartmentPlans.every(
        (plan) =>
          Object.hasOwn(plan, 'sourcePath') &&
          Object.hasOwn(plan, 'fileSizeBytes') &&
          typeof plan.fileId === 'string' &&
          plan.fileId.length > 0,
      ),
    ).toBe(true);
  });

  it('marks discovered but not reconstructed plans explicitly as unresolved', () => {
    const unresolved = TIFERET_SOURCE_INVENTORY.apartmentPlans.filter((plan) => plan.modelStatus === 'unresolved');

    expect(unresolved.length).toBe(98);
    expect(unresolved.every((plan) => plan.unresolvedReason.length > 0)).toBe(true);
  });

  it('preserves every supplied Drive PDF as a unique auditable source document', () => {
    const catalog = loadSourceCatalog();
    const ids = catalog.documents.map((document) => document.driveFileId);
    const paths = catalog.documents.map((document) => document.path);

    expect(catalog).toMatchObject({
      schemaVersion: 1,
      sourceRootId: '1kLVZp1Y08RXiVET_m2bb6QMoMKZKLPZ4',
      totalBytes: 29_628_887,
    });
    expect(catalog.documents).toHaveLength(179);
    expect(new Set(ids).size).toBe(179);
    expect(new Set(paths).size).toBe(179);
    expect(catalog.documents.reduce((total, document) => total + document.sizeBytes, 0)).toBe(29_628_887);
    expect(
      catalog.documents.every(
        (document) =>
          document.mimeType === 'application/pdf' &&
          document.driveUrl.includes(document.driveFileId) &&
          document.title.length > 0 &&
          document.path.startsWith('תפארת/') &&
          document.unresolvedReason.length > 0,
      ),
    ).toBe(true);
  });

  it('classifies all sources without mistaking context drawings for apartment models', () => {
    const documents = loadSourceCatalog().documents;
    const count = (collection: SourceCatalogDocument['collection']) =>
      documents.filter((document) => document.collection === collection).length;

    expect({
      argamanApartment: count('argaman-apartment'),
      argamanFloor: count('argaman-floor'),
      groundApartment: count('ground-apartment'),
      groundContext: count('ground-context'),
      techeletApartment: count('techelet-apartment'),
      techeletFloor: count('techelet-floor'),
    }).toEqual({
      argamanApartment: 36,
      argamanFloor: 12,
      groundApartment: 48,
      groundContext: 8,
      techeletApartment: 63,
      techeletFloor: 12,
    });
    expect(documents.filter((document) => document.documentRole === 'apartment-plan')).toHaveLength(99);
    expect(documents.filter((document) => document.extractionStatus === 'vector-extracted')).toHaveLength(48);
    expect(
      documents.filter(
        (document) => document.extractionStatus === 'vector-extracted' && document.geometryStatus === 'unresolved',
      ),
    ).toHaveLength(47);
    expect(documents.filter((document) => document.geometryStatus === 'modeled')).toHaveLength(0);
    expect(documents.filter((document) => document.mathematicalVerification === 'passed')).toHaveLength(0);
    expect(documents.filter((document) => document.visualVerification === 'passed')).toHaveLength(0);
  });

  it('records readable-text evidence for every source without claiming geometry equivalence', () => {
    const sourceCatalog = loadSourceCatalog();
    const textCatalog = loadTextEvidenceCatalog();
    const sourceIds = new Set(sourceCatalog.documents.map((document) => document.driveFileId));

    expect(textCatalog).toMatchObject({
      schemaVersion: 1,
      extractionMethod: 'google-drive-readable-text',
    });
    expect(textCatalog.records).toHaveLength(179);
    expect(new Set(textCatalog.records.map((record) => record.driveFileId))).toEqual(sourceIds);
    expect(
      textCatalog.records.every(
        (record) =>
          record.extractionStatus === 'text-extracted' &&
          record.textLength > 0 &&
          record.lineCount > 0 &&
          record.equivalenceStatus === 'unproven',
      ),
    ).toBe(true);
  });

  it('uses dimension signatures only to nominate mirrored/repeated candidates for later geometric proof', () => {
    const textCatalog = loadTextEvidenceCatalog();
    const apartmentRecords = textCatalog.records.filter((record) =>
      /\/תוכניות מכר (?:תכלת|ארגמן)\//.test(record.sourcePath),
    );
    const candidateGroups = new Map<string, TextEvidenceRecord[]>();
    for (const record of apartmentRecords) {
      if (record.candidateGeometryGroupId === null) continue;
      const group = candidateGroups.get(record.candidateGeometryGroupId) ?? [];
      candidateGroups.set(record.candidateGeometryGroupId, [...group, record]);
    }

    expect(apartmentRecords).toHaveLength(99);
    expect(apartmentRecords.every((record) => record.dimensionLabelsCm.length > 0)).toBe(true);
    expect(candidateGroups.size).toBe(24);
    expect([...candidateGroups.values()].every((records) => records.length === 2)).toBe(true);
    expect(apartmentRecords.every((record) => record.equivalenceStatus === 'unproven')).toBe(true);
  });

  it('extracts the printed title-block identity for all 99 apartment sheets', () => {
    const titleBlocks = loadTitleBlockEvidenceCatalog();

    expect(titleBlocks.schemaVersion).toBe(1);
    expect(titleBlocks.records).toHaveLength(99);
    expect(new Set(titleBlocks.records.map((record) => record.driveFileId)).size).toBe(99);
    expect(
      titleBlocks.records.every(
        (record) =>
          record.sheet.length > 0 &&
          Number.isInteger(record.floorFromSourceFolder) &&
          record.apartmentNumber.length > 0 &&
          Number.isInteger(record.roomCount) &&
          record.areaSqm > 0 &&
          /^\d{2}\.\d{2}\.\d{2}$/.test(record.date) &&
          record.buildingType.length > 0 &&
          record.scale === '1 : 50' &&
          record.derivation.length > 0,
      ),
    ).toBe(true);
  });

  it('identifies sheet 5-1 as apartment 23-א and preserves its printed sales data', () => {
    const titleBlock = loadTitleBlockEvidenceCatalog().records.find(
      (record) => record.driveFileId === '1RTrFsQ1eBTVzudl3wC0Ocv5DirPh6tBq',
    );

    expect(titleBlock).toMatchObject({
      sheet: '5-1',
      floorFromSourceFolder: 5,
      floorPrinted: '5',
      apartmentNumber: '23-א',
      roomCount: 4,
      areaSqm: 97.4,
      edition: 1,
      coveredBalconySqm: 17.8,
      sukkahBalconySqm: 3.3,
      date: '17.03.26',
      buildingType: 'תכלת א',
    });
  });

  it('records deterministic bidi/fused-field derivations instead of silently guessing', () => {
    const argaman11 = loadTitleBlockEvidenceCatalog().records.find(
      (record) => record.sheet === '1-1' && record.buildingType === 'ארגמן',
    );

    expect(argaman11).toMatchObject({
      floorFromSourceFolder: 1,
      apartmentNumber: '3',
      roomCount: 4,
      areaSqm: 96.3,
    });
    expect(argaman11?.derivation).toContain('fused');
  });
});
