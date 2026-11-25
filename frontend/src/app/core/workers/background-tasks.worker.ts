/// <reference lib="webworker" />

import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import {
  BackgroundWorkerMessage,
  BackgroundWorkerRequest,
  ExportCsvWorkerRequest,
  ExportPdfWorkerRequest,
  ExportXlsxWorkerRequest,
  ImportJsonWorkerRequest,
} from './background-task-worker.types';
import { buildCsvContentFromRows } from './csv-export.processor';
import { processDraftImportPayload } from './draft-import.processor';
import { buildPdfDocumentDefinition } from './pdf-document.builder';
import { buildStyledXlsxWorkbook } from './xlsx-export.processor';

interface WorkerPdfCreatedDocument {
  getBuffer?: () => Promise<Uint8Array>;
}

interface WorkerPdfMakerInstance {
  createPdf?: (docDef: TDocumentDefinitions) => WorkerPdfCreatedDocument;
  addVirtualFileSystem?: (vfs: Record<string, string>) => void;
}

interface WorkerPdfModuleShape {
  readonly default?: WorkerPdfMakerInstance;
  createPdf?: (docDef: TDocumentDefinitions) => WorkerPdfCreatedDocument;
  addVirtualFileSystem?: (vfs: Record<string, string>) => void;
}

interface WorkerVfsModuleShape {
  readonly default?: Record<string, string>;
}

let cachedPdfMakePromise: Promise<WorkerPdfMakerInstance> | null = null;

function postWorkerMessage(message: BackgroundWorkerMessage, transfer: Transferable[] = []): void {
  postMessage(message, transfer);
}

function toTransferableArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function loadPdfMakerInWorker(): Promise<WorkerPdfMakerInstance> {
  if (!cachedPdfMakePromise) {
    cachedPdfMakePromise = (async () => {
      const pdfMakeMod = (await import('pdfmake/build/pdfmake')) as unknown as WorkerPdfModuleShape;
      const vfsMod = (await import('pdfmake/build/vfs_fonts')) as unknown as WorkerVfsModuleShape &
        Record<string, string>;
      const pdfMake: WorkerPdfMakerInstance = pdfMakeMod.default ?? pdfMakeMod;
      const vfs = vfsMod.default ?? vfsMod;

      if (typeof pdfMake.addVirtualFileSystem === 'function') {
        pdfMake.addVirtualFileSystem(vfs as Record<string, string>);
      }

      if (typeof pdfMake.createPdf !== 'function') {
        throw new Error('pdfmake createPdf API could not be initialized inside worker.');
      }

      return pdfMake;
    })();
  }
  return cachedPdfMakePromise;
}

async function handleImportJson(request: ImportJsonWorkerRequest): Promise<void> {
  const summary = await processDraftImportPayload(request, (stage, progress) => {
    postWorkerMessage({
      type: 'progress',
      requestId: request.requestId,
      stage,
      progress,
    });
  });

  postWorkerMessage({
    type: 'result',
    requestId: request.requestId,
    task: 'import_json',
    summary,
  });
}

async function handleExportPdf(request: ExportPdfWorkerRequest): Promise<void> {
  postWorkerMessage({
    type: 'progress',
    requestId: request.requestId,
    stage: 'preparing',
    progress: 20,
  });

  const pdfMake = await loadPdfMakerInWorker();

  postWorkerMessage({
    type: 'progress',
    requestId: request.requestId,
    stage: 'building',
    progress: 45,
  });

  const docDef = buildPdfDocumentDefinition(
    request.schema,
    request.rows,
    request.texts,
    request.layout,
  );

  postWorkerMessage({
    type: 'progress',
    requestId: request.requestId,
    stage: 'rendering',
    progress: 75,
  });

  const created = pdfMake.createPdf?.(docDef);
  if (!created || typeof created.getBuffer !== 'function') {
    throw new Error('pdfmake getBuffer API is unavailable inside worker.');
  }

  const rawBytes = await created.getBuffer();
  const transferBuffer = toTransferableArrayBuffer(rawBytes);

  postWorkerMessage({
    type: 'progress',
    requestId: request.requestId,
    stage: 'complete',
    progress: 100,
  });

  postWorkerMessage(
    {
      type: 'result',
      requestId: request.requestId,
      task: 'export_pdf',
      buffer: transferBuffer,
    },
    [transferBuffer],
  );
}

function handleExportXlsx(request: ExportXlsxWorkerRequest): void {
  const xlsxBytes = buildStyledXlsxWorkbook(
    {
      schema: request.schema,
      rows: request.rows,
      texts: request.texts,
      layout: request.layout,
      labels: request.labels,
    },
    (stage, progress) => {
      postWorkerMessage({
        type: 'progress',
        requestId: request.requestId,
        stage,
        progress,
      });
    },
  );

  const transferBuffer = toTransferableArrayBuffer(xlsxBytes);
  postWorkerMessage(
    {
      type: 'result',
      requestId: request.requestId,
      task: 'export_xlsx',
      buffer: transferBuffer,
    },
    [transferBuffer],
  );
}

function handleExportCsv(request: ExportCsvWorkerRequest): void {
  postWorkerMessage({
    type: 'progress',
    requestId: request.requestId,
    stage: 'preparing',
    progress: 30,
  });

  const textContent = buildCsvContentFromRows(request.rows);

  postWorkerMessage({
    type: 'progress',
    requestId: request.requestId,
    stage: 'complete',
    progress: 100,
  });

  postWorkerMessage({
    type: 'result',
    requestId: request.requestId,
    task: 'export_csv',
    textContent,
  });
}

addEventListener('message', async (event: MessageEvent<BackgroundWorkerRequest>) => {
  const request = event.data;
  if (!request) {
    return;
  }

  try {
    switch (request.task) {
      case 'export_pdf':
        await handleExportPdf(request);
        return;
      case 'export_xlsx':
        handleExportXlsx(request);
        return;
      case 'export_csv':
        handleExportCsv(request);
        return;
      case 'import_json':
      default:
        await handleImportJson(request);
        return;
    }
  } catch (error: unknown) {
    postWorkerMessage({
      type: 'error',
      requestId: request.requestId,
      message: error instanceof Error ? error.message : 'Unexpected background worker failure.',
    });
  }
});
