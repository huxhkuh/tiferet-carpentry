import * as Comlink from 'comlink';
import PdfImportWorker from '../../workers/pdf-import.worker?worker';
import type { PdfImportWorkerApi } from '../../workers/pdf-import.worker';
import { workerRequest } from '../../utils/worker-request';
import { analyzeArchitecturalPdf } from './pdf-import';
import { parsePdfVectorDocument } from './pdf-vector-parser';

async function request<T>(
  run: (api: Comlink.Remote<PdfImportWorkerApi>) => Promise<T>,
  fallback: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (signal?.aborted) throw new DOMException('Import cancelled', 'AbortError');
  if (typeof Worker === 'undefined') return fallback();
  const worker = new PdfImportWorker();
  try {
    return await workerRequest(run(Comlink.wrap<PdfImportWorkerApi>(worker)), worker, 60_000, signal);
  } finally {
    worker.terminate();
  }
}

export function analyzePdfFile(file: File, signal?: AbortSignal) {
  if (file.size > 20 * 1024 * 1024) return Promise.reject(new RangeError('ניתן לייבא קובצי PDF בגודל של עד 20MB'));
  return request(
    (api) => api.analyze(file),
    () => analyzeArchitecturalPdf(file),
    signal,
  );
}

export function parsePdfBytes(bytes: Uint8Array, signal?: AbortSignal) {
  if (bytes.byteLength > 20 * 1024 * 1024)
    return Promise.reject(new RangeError('ניתן לייבא קובצי PDF בגודל של עד 20MB'));
  return request(
    (api) => api.parse(bytes),
    () => parsePdfVectorDocument(bytes),
    signal,
  );
}
