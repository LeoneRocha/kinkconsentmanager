/// <reference lib="webworker" />

import {
  BackgroundTaskStage,
  BackgroundWorkerMessage,
  BackgroundWorkerRequest,
} from './background-task-worker.types';
import { processCsvExportPayload } from './csv-export.processor';
import { processDraftImportPayload } from './draft-import.processor';
import { processPdfExportPayload } from './pdf-export.processor';
import { processXlsxExportPayload } from './xlsx-export.processor';

function postWorkerMessage(message: BackgroundWorkerMessage, transfer: Transferable[] = []): void {
  postMessage(message, transfer);
}

function postProgress(requestId: string, stage: BackgroundTaskStage, progress: number): void {
  postWorkerMessage({
    type: 'progress',
    requestId,
    stage,
    progress,
  });
}

function toTransferableArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

addEventListener('message', async (event: MessageEvent<BackgroundWorkerRequest>) => {
  const request = event.data;
  if (!request) {
    return;
  }

  const emitProgress = (stage: BackgroundTaskStage, progress: number): void =>
    postProgress(request.requestId, stage, progress);

  try {
    switch (request.task) {
      case 'export_pdf': {
        const pdfBytes = await processPdfExportPayload(request, emitProgress);
        const buffer = toTransferableArrayBuffer(pdfBytes);
        postWorkerMessage(
          { type: 'result', requestId: request.requestId, task: 'export_pdf', buffer },
          [buffer],
        );
        return;
      }
      case 'export_xlsx': {
        const xlsxBytes = processXlsxExportPayload(request, emitProgress);
        const buffer = toTransferableArrayBuffer(xlsxBytes);
        postWorkerMessage(
          { type: 'result', requestId: request.requestId, task: 'export_xlsx', buffer },
          [buffer],
        );
        return;
      }
      case 'export_csv': {
        const textContent = processCsvExportPayload(request, emitProgress);
        postWorkerMessage({
          type: 'result',
          requestId: request.requestId,
          task: 'export_csv',
          textContent,
        });
        return;
      }
      case 'import_json':
      default: {
        const summary = await processDraftImportPayload(request, emitProgress);
        postWorkerMessage({
          type: 'result',
          requestId: request.requestId,
          task: 'import_json',
          summary,
        });
        return;
      }
    }
  } catch (error: unknown) {
    postWorkerMessage({
      type: 'error',
      requestId: request.requestId,
      message: error instanceof Error ? error.message : 'Unexpected background worker failure.',
    });
  }
});
