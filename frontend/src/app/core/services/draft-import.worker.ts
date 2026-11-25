/// <reference lib="webworker" />

import {
  DraftImportWorkerMessage,
  DraftImportWorkerRequest,
  processDraftImportPayload,
} from './draft-import.processor';

function postWorkerMessage(message: DraftImportWorkerMessage): void {
  postMessage(message);
}

addEventListener('message', async (event: MessageEvent<DraftImportWorkerRequest>) => {
  const request = event.data;
  if (!request) {
    return;
  }

  try {
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
      summary,
    });
  } catch (error: unknown) {
    postWorkerMessage({
      type: 'error',
      requestId: request.requestId,
      message: error instanceof Error ? error.message : 'Unexpected draft import worker failure.',
    });
  }
});
