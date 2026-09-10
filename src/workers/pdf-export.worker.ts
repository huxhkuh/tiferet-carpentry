import * as Comlink from 'comlink';
import { pdf } from '@react-pdf/renderer';
import { CabinetPdfDocument, type CabinetPdfProps } from '../components/pdf/CabinetPdfDocument';

export interface PdfExportWorkerApi {
  run(input: CabinetPdfProps): Promise<Blob>;
}

const api: PdfExportWorkerApi = {
  run: async (input) => pdf(CabinetPdfDocument(input)).toBlob(),
};

Comlink.expose(api);
