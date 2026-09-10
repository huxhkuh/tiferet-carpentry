import * as Comlink from 'comlink';
import { analyzeArchitecturalPdf } from '../apartment/import/pdf-import';
import { parsePdfVectorDocument } from '../apartment/import/pdf-vector-parser';

const api = { analyze: analyzeArchitecturalPdf, parse: parsePdfVectorDocument };
export type PdfImportWorkerApi = typeof api;
Comlink.expose(api);
