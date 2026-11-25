import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import { DraftValidationResult } from '../models';
import { DRAFT_IMPORT_WORKER_FACTORY } from './draft-import-worker.factory';
import {
  DraftImportProcessSummary,
  DraftImportWorkerMessage,
  DraftImportWorkerStage,
  parseAndValidateDraftContent,
  processDraftImportPayload,
} from './draft-import.processor';

export interface DraftImportProcessOutcome extends DraftImportProcessSummary {
  readonly processedInWorker: boolean;
}

export interface DraftImportOptions {
  readonly minDisplayMs?: number;
}

let nextRequestCounter = 0;

/**
 * Orquestra o processamento em background (Web Worker) de arquivos JSON importados,
 * expondo sinais reativos de progresso para o overlay global de carregamento e oferecendo
 * fallback automático em memória quando Web Workers não estão disponíveis.
 */
@Injectable({ providedIn: 'root' })
export class DraftImportWorkerService implements OnDestroy {
  private readonly workerFactory = inject(DRAFT_IMPORT_WORKER_FACTORY);

  private readonly _isProcessing = signal<boolean>(false);
  private readonly _stage = signal<DraftImportWorkerStage>('reading');
  private readonly _progress = signal<number>(0);
  private readonly _fileName = signal<string>('');
  private readonly _usedBackgroundWorker = signal<boolean>(false);

  readonly isProcessing = this._isProcessing.asReadonly();
  readonly stage = this._stage.asReadonly();
  readonly progress = this._progress.asReadonly();
  readonly fileName = this._fileName.asReadonly();
  readonly usedBackgroundWorker = this._usedBackgroundWorker.asReadonly();

  private activeWorker: Worker | null = null;

  /**
   * Processa o arquivo selecionado em segundo plano e retorna o resultado validado
   * pronto para restauração no `ChecklistStateService`.
   */
  async importDraftFile(
    file: File,
    expectedSchemaVersion: string,
    options?: DraftImportOptions,
  ): Promise<DraftImportProcessOutcome> {
    const startedAt = Date.now();
    this._isProcessing.set(true);
    this._fileName.set(file.name);
    this._stage.set('reading');
    this._progress.set(15);

    let processedInWorker = false;
    try {
      const workerSummary = await this.tryRunInWorker(file, expectedSchemaVersion);
      let summary: DraftImportProcessSummary;

      if (workerSummary !== null) {
        processedInWorker = true;
        summary = workerSummary;
      } else {
        this._usedBackgroundWorker.set(false);
        summary = await processDraftImportPayload(
          {
            requestId: `fallback-${++nextRequestCounter}`,
            file,
            expectedSchemaVersion,
          },
          (stage, progress) => {
            this._stage.set(stage);
            this._progress.set(progress);
          },
        );
      }

      const targetMinDisplayMs = options?.minDisplayMs ?? (processedInWorker ? 380 : 0);
      if (targetMinDisplayMs > 0) {
        const elapsedMs = Date.now() - startedAt;
        const remainingMs = targetMinDisplayMs - elapsedMs;
        if (remainingMs > 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, remainingMs));
        }
      }

      return {
        ...summary,
        processedInWorker,
      };
    } finally {
      this._isProcessing.set(false);
    }
  }

  /**
   * Permite validar conteúdo JSON diretamente usando a mesma lógica compartilhada do processador.
   */
  validateRawContent(rawContent: string, expectedSchemaVersion: string): DraftValidationResult {
    return parseAndValidateDraftContent(rawContent, expectedSchemaVersion);
  }

  ngOnDestroy(): void {
    this.terminateWorker();
  }

  private async tryRunInWorker(
    file: File,
    expectedSchemaVersion: string,
  ): Promise<DraftImportProcessSummary | null> {
    const worker = this.ensureWorker();
    if (!worker) {
      return null;
    }

    const requestId = `draft-import-${++nextRequestCounter}`;
    this._usedBackgroundWorker.set(true);

    return new Promise<DraftImportProcessSummary | null>((resolve) => {
      const cleanup = (): void => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
      };

      const handleMessage = (event: MessageEvent<DraftImportWorkerMessage>): void => {
        const payload = event.data;
        if (!payload || payload.requestId !== requestId) {
          return;
        }

        if (payload.type === 'progress') {
          this._stage.set(payload.stage);
          this._progress.set(payload.progress);
          return;
        }

        cleanup();
        if (payload.type === 'result') {
          resolve(payload.summary);
          return;
        }

        // Em erro inesperado do worker, cai graciosamente para processamento em memória.
        this.terminateWorker();
        resolve(null);
      };

      const handleError = (): void => {
        cleanup();
        this.terminateWorker();
        resolve(null);
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);

      try {
        worker.postMessage({
          requestId,
          file,
          expectedSchemaVersion,
        });
      } catch {
        cleanup();
        this.terminateWorker();
        resolve(null);
      }
    });
  }

  private ensureWorker(): Worker | null {
    if (this.activeWorker) {
      return this.activeWorker;
    }
    try {
      this.activeWorker = this.workerFactory();
    } catch {
      this.activeWorker = null;
    }
    return this.activeWorker;
  }

  private terminateWorker(): void {
    if (this.activeWorker) {
      this.activeWorker.terminate();
      this.activeWorker = null;
    }
  }
}
