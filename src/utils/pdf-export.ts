import * as Comlink from 'comlink';
import PdfExportWorker from '../workers/pdf-export.worker?worker';
import type { PdfExportWorkerApi } from '../workers/pdf-export.worker';
import type { CabinetPdfProps } from '../components/pdf/CabinetPdfDocument';
import { workerRequest } from './worker-request';

export async function renderPdfInWorker(props: CabinetPdfProps, signal?: AbortSignal): Promise<Blob> {
  const worker = new PdfExportWorker();
  const proxy = Comlink.wrap<PdfExportWorkerApi>(worker);
  try {
    if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
    return await workerRequest(proxy.run(props), worker, 120_000, signal);
  } finally {
    worker.terminate();
  }
}
