import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const workspace = process.cwd();
const sourceInventoryPath = resolve(workspace, 'public/tiferet/catalog/source-inventory.json');
const vectorEvidencePath = resolve(workspace, 'public/tiferet/catalog/vector-evidence.json');
const sourceInventory = JSON.parse(readFileSync(sourceInventoryPath, 'utf8'));
const vectorEvidence = JSON.parse(readFileSync(vectorEvidencePath, 'utf8'));
const vectorSourceIds = new Set(vectorEvidence.documents.map((document) => document.driveFileId));

if (vectorSourceIds.size !== vectorEvidence.validatedSourcePdfCount || vectorSourceIds.size !== 48) {
  throw new Error('Vector evidence must contain exactly 48 unique byte-validated PDFs.');
}

const documents = sourceInventory.documents.map((document) => ({
  ...document,
  extractionStatus: vectorSourceIds.has(document.driveFileId) ? 'vector-extracted' : 'text-extracted',
  unresolvedReason:
    document.driveFileId === '1RTrFsQ1eBTVzudl3wC0Ocv5DirPh6tBq'
      ? document.unresolvedReason
      : vectorSourceIds.has(document.driveFileId)
        ? 'Raw vectors and positioned text were extracted from a byte-validated PDF, but semantic wall/opening reconstruction, heights, mathematical closure, and visual overlay verification remain pending.'
        : document.unresolvedReason,
}));

writeFileSync(sourceInventoryPath, `${JSON.stringify({ ...sourceInventory, documents }, null, 2)}\n`, 'utf8');
console.log(`Marked ${vectorSourceIds.size} source PDFs as vector-extracted.`);
