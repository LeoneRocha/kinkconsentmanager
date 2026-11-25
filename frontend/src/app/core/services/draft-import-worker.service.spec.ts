import { TestBed } from '@angular/core/testing';
import { DRAFT_IMPORT_WORKER_FACTORY } from './draft-import-worker.factory';
import { DraftImportWorkerService } from './draft-import-worker.service';
import { DraftImportWorkerMessage } from './draft-import.processor';

describe('DraftImportWorkerService', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    jest.restoreAllMocks();
  });

  // Cenário: Processamento de importação via Web Worker injetado por factory.
  // Objetivo: Garantir atualização reativa dos sinais de progresso, resolução final, flag processedInWorker e terminate ao destruir.
  it('should process file in background worker, update reactive progress signals, and terminate worker on destroy', async () => {
    const listeners = new Map<string, ((event: unknown) => void)[]>();
    const postMessageMock = jest.fn((data: { requestId: string }) => {
      const msgListeners = listeners.get('message') ?? [];
      queueMicrotask(() => {
        const progressMsg: DraftImportWorkerMessage = {
          type: 'progress',
          requestId: data.requestId,
          stage: 'parsing',
          progress: 55,
        };
        msgListeners.forEach((cb) => cb({ data: progressMsg }));

        const resultMsg: DraftImportWorkerMessage = {
          type: 'result',
          requestId: data.requestId,
          summary: {
            answeredCount: 1,
            durationMs: 4,
            validation: {
              valid: true,
              errors: [],
              draft: {
                schemaVersion: '1.0.0',
                exportedAt: '2026-11-24T21:00:00.000Z',
                language: 'pt-BR',
                answers: { item_rope: { primaryScale: 'favorite' } },
              },
            },
          },
        };
        msgListeners.forEach((cb) => cb({ data: resultMsg }));
      });
    });
    const terminateMock = jest.fn();

    const fakeWorker = {
      postMessage: postMessageMock,
      terminate: terminateMock,
      addEventListener: jest.fn((type: string, cb: (event: unknown) => void) => {
        listeners.set(type, [...(listeners.get(type) ?? []), cb]);
      }),
      removeEventListener: jest.fn((type: string, cb: (event: unknown) => void) => {
        listeners.set(
          type,
          (listeners.get(type) ?? []).filter((entry) => entry !== cb),
        );
      }),
    } as unknown as Worker;

    TestBed.configureTestingModule({
      providers: [
        DraftImportWorkerService,
        { provide: DRAFT_IMPORT_WORKER_FACTORY, useValue: () => fakeWorker },
      ],
    });

    const service = TestBed.inject(DraftImportWorkerService);
    const file = new File(['{}'], 'meu-rascunho.json', { type: 'application/json' });

    const promise = service.importDraftFile(file, '1.0.0', { minDisplayMs: 0 });
    expect(service.isProcessing()).toBe(true);
    expect(service.fileName()).toBe('meu-rascunho.json');

    const outcome = await promise;
    expect(service.isProcessing()).toBe(false);
    expect(service.stage()).toBe('parsing');
    expect(service.progress()).toBe(55);
    expect(outcome.processedInWorker).toBe(true);
    expect(outcome.validation.valid).toBe(true);
    expect(outcome.answeredCount).toBe(1);
    expect(postMessageMock).toHaveBeenCalledTimes(1);

    service.ngOnDestroy();
    expect(terminateMock).toHaveBeenCalledTimes(1);
  });

  // Cenário: Fallback automático quando Web Workers não estão disponíveis ou falham com erro.
  // Objetivo: Garantir continuidade transparente da validação sem travar nem rejeitar a importação.
  it('should fall back gracefully to in-memory processing when worker factory returns null', async () => {
    TestBed.configureTestingModule({
      providers: [
        DraftImportWorkerService,
        { provide: DRAFT_IMPORT_WORKER_FACTORY, useValue: () => null },
      ],
    });

    const service = TestBed.inject(DraftImportWorkerService);
    const file = {
      name: 'fallback.json',
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          schemaVersion: '1.0.0',
          exportedAt: '2026-11-24T21:00:00.000Z',
          language: 'pt-BR',
          answers: { item_a: { primaryScale: 'enjoy' } },
        }),
      ),
    } as unknown as File;

    const outcome = await service.importDraftFile(file, '1.0.0');

    expect(service.isProcessing()).toBe(false);
    expect(service.stage()).toBe('complete');
    expect(service.progress()).toBe(100);
    expect(outcome.processedInWorker).toBe(false);
    expect(outcome.validation.valid).toBe(true);
    expect(outcome.answeredCount).toBe(1);
  });
});
