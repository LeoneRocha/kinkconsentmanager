import { inject, Injectable, InjectionToken, OnDestroy, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  ChecklistSchema,
  DraftValidationResult,
  ExportSummaryLayout,
  FlattenedChecklistRow,
  ResolvedPreviewTexts,
} from '../models';
import {
  BACKGROUND_TASK_WORKER_FACTORY,
  BackgroundBinaryOutcome,
  BackgroundProgressMode,
  BackgroundTaskKind,
  BackgroundTaskOptions,
  BackgroundTaskStage,
  BackgroundTaskTimingConfig,
  BackgroundTextOutcome,
  BackgroundWorkerMessage,
  BackgroundWorkerRequest,
  BackgroundWorkerResultMessage,
  buildCsvContentFromRows,
  buildStyledXlsxWorkbook,
  CsvExportContext,
  DraftImportProcessSummary,
  parseAndValidateDraftContent,
  processDraftImportPayload,
  TrackedBackgroundTaskConfig,
  XlsxExportLabels,
} from '../workers';

export interface BackgroundDraftImportOutcome extends DraftImportProcessSummary {
  readonly processedInWorker: boolean;
}

interface ResolvedTimings {
  readonly startDelayMs: number;
  readonly minProcessingMs: number;
  readonly completionDelayMs: number;
  readonly progressMode: BackgroundProgressMode;
  readonly progressTickMs: number;
  readonly virtualProgressCap: number;
}

export interface WorkerLoadingTimingInput {
  readonly totalDelayMs: number;
  readonly startDelayMs: number;
  readonly completionDelayMs: number;
  readonly progressTickMs: number;
  readonly virtualProgressCap: number;
}

/**
 * Converte a configuração de ambiente (`workerLoading`) em janelas proporcionais de delay inicial,
 * processamento mínimo e confirmação final, preservando a soma em `totalDelayMs` (padrão 3000ms).
 */
export function resolveEnvironmentTimingConfig(
  config: WorkerLoadingTimingInput,
): BackgroundTaskTimingConfig {
  const totalDelayMs = Math.max(0, Math.round(config.totalDelayMs));
  const progressTickMs = Math.max(15, Math.round(config.progressTickMs));
  const virtualProgressCap = Math.max(50, Math.min(98, Math.round(config.virtualProgressCap)));

  if (totalDelayMs === 0) {
    return {
      startDelayMs: 0,
      minProcessingMs: 0,
      completionDelayMs: 0,
      progressTickMs,
      virtualProgressCap,
    };
  }

  const startDelayMs = Math.min(
    Math.max(0, Math.round(config.startDelayMs)),
    Math.round(totalDelayMs * 0.25),
  );
  const completionDelayMs = Math.min(
    Math.max(0, Math.round(config.completionDelayMs)),
    Math.round(totalDelayMs * 0.35),
  );
  const minProcessingMs = Math.max(0, totalDelayMs - startDelayMs - completionDelayMs);

  return {
    startDelayMs,
    minProcessingMs,
    completionDelayMs,
    progressTickMs,
    virtualProgressCap,
  };
}

/**
 * Configuração padrão de cadência visual lida de `environment.workerLoading` (3000ms padrão).
 * Em ambientes sem `Worker` (ex.: testes Jest), os atrasos padrão são zerados para manter a suíte rápida.
 */
export const BACKGROUND_TASK_TIMING_CONFIG = new InjectionToken<BackgroundTaskTimingConfig>(
  'BACKGROUND_TASK_TIMING_CONFIG',
  {
    providedIn: 'root',
    factory: () =>
      typeof Worker !== 'undefined'
        ? resolveEnvironmentTimingConfig(environment.workerLoading)
        : {
            startDelayMs: 0,
            minProcessingMs: 0,
            completionDelayMs: 0,
            progressTickMs: environment.workerLoading.progressTickMs,
            virtualProgressCap: environment.workerLoading.virtualProgressCap,
          },
  },
);

let nextRequestCounter = 0;

/**
 * Orquestra tarefas pesadas em segundo plano usando Web Worker isolado (importação JSON,
 * geração de PNG/PDF/XLSX/CSV), oferecendo lead-in visual antes de iniciar, barra progressiva
 * nos modos virtual, sincronizado ou híbrido e confirmação visual ao concluir.
 */
@Injectable({ providedIn: 'root' })
export class BackgroundTaskWorkerService implements OnDestroy {
  private readonly workerFactory = inject(BACKGROUND_TASK_WORKER_FACTORY);
  private readonly timingConfig = inject(BACKGROUND_TASK_TIMING_CONFIG);

  private readonly _isProcessing = signal<boolean>(false);
  private readonly _isCompleted = signal<boolean>(false);
  private readonly _taskKind = signal<BackgroundTaskKind | null>(null);
  private readonly _progressMode = signal<BackgroundProgressMode>('hybrid');
  private readonly _stage = signal<BackgroundTaskStage>('reading');
  private readonly _progress = signal<number>(0);
  private readonly _fileName = signal<string>('');
  private readonly _usedBackgroundWorker = signal<boolean>(false);

  readonly isProcessing = this._isProcessing.asReadonly();
  readonly isCompleted = this._isCompleted.asReadonly();
  readonly taskKind = this._taskKind.asReadonly();
  readonly progressMode = this._progressMode.asReadonly();
  readonly stage = this._stage.asReadonly();
  readonly progress = this._progress.asReadonly();
  readonly fileName = this._fileName.asReadonly();
  readonly usedBackgroundWorker = this._usedBackgroundWorker.asReadonly();

  private activeWorker: Worker | null = null;
  private progressTimer: ReturnType<typeof setInterval> | null = null;
  private syncedFloor = 0;
  private virtualCursor = 0;

  /**
   * Executa qualquer tarefa assíncrona acompanhada pelo overlay de loading com delay inicial,
   * barra progressiva (virtual, sincronizada ou híbrida) e confirmação visual final.
   */
  async runTrackedTask<T>(config: TrackedBackgroundTaskConfig<T>): Promise<T> {
    return this.executeWithLifecycle({
      kind: config.kind,
      fileName: config.fileName,
      initialStage: config.initialStage ?? 'preparing',
      defaultMode: 'virtual',
      options: config.options,
      shouldShowCompletion: config.shouldShowCompletion,
      work: config.run,
    });
  }

  /**
   * Processa o arquivo JSON selecionado em segundo plano e retorna o resultado validado
   * pronto para restauração no `ChecklistStateService`.
   */
  async importDraftFile(
    file: File,
    expectedSchemaVersion: string,
    options?: BackgroundTaskOptions,
  ): Promise<BackgroundDraftImportOutcome> {
    return this.executeWithLifecycle({
      kind: 'import_json',
      fileName: file.name,
      initialStage: 'reading',
      defaultMode: 'hybrid',
      options,
      shouldShowCompletion: (outcome) => outcome.validation.valid,
      work: async (reportProgress) => {
        const workerResult = await this.tryRunWorkerTask(
          {
            task: 'import_json',
            requestId: `bg-import-${++nextRequestCounter}`,
            file,
            expectedSchemaVersion,
          },
          reportProgress,
        );

        if (workerResult?.summary) {
          return {
            ...workerResult.summary,
            processedInWorker: true,
          };
        }

        this._usedBackgroundWorker.set(false);
        const summary = await processDraftImportPayload(
          {
            requestId: `fallback-${++nextRequestCounter}`,
            file,
            expectedSchemaVersion,
          },
          (stage, progress) => reportProgress(stage, progress),
        );

        return {
          ...summary,
          processedInWorker: false,
        };
      },
    });
  }

  /**
   * Gera os bytes binários do PDF em segundo plano via Web Worker.
   * Retorna `null` imediatamente quando não há suporte a Web Worker (para fallback no `PdfExportService`).
   */
  async generatePdfBytes(
    schema: ChecklistSchema,
    rows: readonly FlattenedChecklistRow[],
    texts: ResolvedPreviewTexts,
    layout: ExportSummaryLayout,
    fileName: string,
    options?: BackgroundTaskOptions,
  ): Promise<BackgroundBinaryOutcome | null> {
    if (!this.ensureWorker()) {
      this._usedBackgroundWorker.set(false);
      return null;
    }

    return this.executeWithLifecycle({
      kind: 'export_pdf',
      fileName,
      initialStage: 'preparing',
      defaultMode: 'hybrid',
      options,
      shouldShowCompletion: (outcome) => outcome !== null,
      work: async (reportProgress) => {
        const workerResult = await this.tryRunWorkerTask(
          {
            task: 'export_pdf',
            requestId: `bg-pdf-${++nextRequestCounter}`,
            schema,
            rows,
            texts,
            layout,
          },
          reportProgress,
        );

        if (!workerResult?.buffer) {
          this._usedBackgroundWorker.set(false);
          return null;
        }

        return {
          bytes: new Uint8Array(workerResult.buffer),
          processedInWorker: true,
        };
      },
    });
  }

  /**
   * Gera os bytes binários da planilha Excel `.xlsx` estilizada conforme o layout escolhido,
   * rodando em Web Worker ou com fallback síncrono em memória quando indisponível.
   */
  async generateXlsxBytes(
    schema: ChecklistSchema,
    rows: readonly FlattenedChecklistRow[],
    texts: ResolvedPreviewTexts,
    layout: ExportSummaryLayout,
    labels: XlsxExportLabels,
    fileName: string,
    options?: BackgroundTaskOptions,
  ): Promise<BackgroundBinaryOutcome> {
    return this.executeWithLifecycle({
      kind: 'export_xlsx',
      fileName,
      initialStage: 'preparing',
      defaultMode: 'hybrid',
      options,
      shouldShowCompletion: (outcome) => outcome.bytes.byteLength > 0,
      work: async (reportProgress) => {
        const workerResult = await this.tryRunWorkerTask(
          {
            task: 'export_xlsx',
            requestId: `bg-xlsx-${++nextRequestCounter}`,
            schema,
            rows,
            texts,
            layout,
            labels,
          },
          reportProgress,
        );

        if (workerResult?.buffer) {
          return {
            bytes: new Uint8Array(workerResult.buffer),
            processedInWorker: true,
          };
        }

        this._usedBackgroundWorker.set(false);
        const bytes = buildStyledXlsxWorkbook(
          { schema, rows, texts, layout, labels },
          (stage, progress) => reportProgress(stage, progress),
        );

        return { bytes, processedInWorker: false };
      },
    });
  }

  /**
   * Gera o conteúdo CSV UTF-8 BOM em Web Worker ou em memória como fallback.
   */
  async generateCsvContent(
    rows: readonly FlattenedChecklistRow[],
    fileName: string,
    options?: BackgroundTaskOptions,
    context?: CsvExportContext,
  ): Promise<BackgroundTextOutcome> {
    return this.executeWithLifecycle({
      kind: 'export_csv',
      fileName,
      initialStage: 'preparing',
      defaultMode: 'hybrid',
      options,
      shouldShowCompletion: (outcome) => outcome.textContent.length > 0,
      work: async (reportProgress) => {
        const workerResult = await this.tryRunWorkerTask(
          {
            task: 'export_csv',
            requestId: `bg-csv-${++nextRequestCounter}`,
            rows,
            context,
          },
          reportProgress,
        );

        if (typeof workerResult?.textContent === 'string') {
          return {
            textContent: workerResult.textContent,
            processedInWorker: true,
          };
        }

        this._usedBackgroundWorker.set(false);
        reportProgress('building', 70);
        const textContent = buildCsvContentFromRows(rows, context);
        reportProgress('complete', 100);

        return { textContent, processedInWorker: false };
      },
    });
  }

  /**
   * Valida conteúdo JSON diretamente usando a lógica compartilhada do processador.
   */
  validateRawContent(rawContent: string, expectedSchemaVersion: string): DraftValidationResult {
    return parseAndValidateDraftContent(rawContent, expectedSchemaVersion);
  }

  terminateWorker(): void {
    this.stopProgressTicker();
    if (this.activeWorker) {
      this.activeWorker.terminate();
      this.activeWorker = null;
    }
  }

  ngOnDestroy(): void {
    this.terminateWorker();
  }

  private async executeWithLifecycle<T>(params: {
    readonly kind: BackgroundTaskKind;
    readonly fileName: string;
    readonly initialStage: BackgroundTaskStage;
    readonly defaultMode: BackgroundProgressMode;
    readonly options?: BackgroundTaskOptions;
    readonly shouldShowCompletion?: (result: T) => boolean;
    readonly work: (
      reportProgress: (stage: BackgroundTaskStage, progress: number) => void,
    ) => Promise<T>;
  }): Promise<T> {
    const resolved = this.resolveTimings(params.options, params.defaultMode);
    const initialProgress = resolved.progressMode === 'synchronized' ? 0 : 8;

    this.beginTask(
      params.kind,
      params.fileName,
      params.initialStage,
      initialProgress,
      resolved.progressMode,
    );
    this.startProgressTicker(
      resolved.progressMode,
      resolved.progressTickMs,
      resolved.virtualProgressCap,
      params.kind,
      resolved.startDelayMs + resolved.minProcessingMs,
    );

    const reportSynchronizedProgress = (stage: BackgroundTaskStage, rawPct: number): void => {
      const hasPendingHold = resolved.minProcessingMs > 0;
      const effectiveStage: BackgroundTaskStage =
        hasPendingHold && stage === 'complete'
          ? params.kind === 'import_json'
            ? 'validating'
            : 'packaging'
          : stage;
      const maxActivePct = hasPendingHold ? resolved.virtualProgressCap : 100;
      const clampedPct = Math.max(0, Math.min(maxActivePct, Math.round(rawPct)));

      this.syncedFloor = Math.max(this.syncedFloor, clampedPct);
      this._stage.set(effectiveStage);

      if (resolved.progressMode === 'synchronized') {
        this.virtualCursor = clampedPct;
        this._progress.set(clampedPct);
        return;
      }

      this.virtualCursor = Math.max(this.virtualCursor, clampedPct);
      this._progress.set(Math.max(this._progress(), clampedPct));
    };

    try {
      // Delay inicial visual: permite ao usuário perceber o overlay antes do trabalho pesado iniciar.
      await this.waitMs(resolved.startDelayMs);

      const processingStartedAt = Date.now();
      const result = await params.work(reportSynchronizedProgress);

      await this.ensureMinimumDisplayTime(processingStartedAt, resolved.minProcessingMs);
      this.stopProgressTicker();

      const showCompletion = params.shouldShowCompletion
        ? params.shouldShowCompletion(result)
        : true;
      if (showCompletion) {
        this._stage.set('complete');
        this._progress.set(100);
        this._isCompleted.set(true);
        await this.waitMs(resolved.completionDelayMs);
      }

      return result;
    } finally {
      this.stopProgressTicker();
      this._isCompleted.set(false);
      this._isProcessing.set(false);
      this._taskKind.set(null);
    }
  }

  private resolveTimings(
    options: BackgroundTaskOptions | undefined,
    defaultMode: BackgroundProgressMode,
  ): ResolvedTimings {
    return {
      startDelayMs: Math.max(0, options?.startDelayMs ?? this.timingConfig.startDelayMs),
      minProcessingMs: Math.max(0, options?.minDisplayMs ?? this.timingConfig.minProcessingMs),
      completionDelayMs: Math.max(
        0,
        options?.completionDelayMs ?? this.timingConfig.completionDelayMs,
      ),
      progressMode: options?.progressMode ?? defaultMode,
      progressTickMs: Math.max(15, options?.progressTickMs ?? this.timingConfig.progressTickMs),
      virtualProgressCap: Math.max(50, Math.min(98, this.timingConfig.virtualProgressCap)),
    };
  }

  private beginTask(
    kind: BackgroundTaskKind,
    fileName: string,
    initialStage: BackgroundTaskStage,
    initialProgress: number,
    mode: BackgroundProgressMode,
  ): void {
    this.stopProgressTicker();
    this.syncedFloor = initialProgress;
    this.virtualCursor = initialProgress;
    this._isCompleted.set(false);
    this._isProcessing.set(true);
    this._taskKind.set(kind);
    this._progressMode.set(mode);
    this._fileName.set(fileName);
    this._stage.set(initialStage);
    this._progress.set(initialProgress);
  }

  private startProgressTicker(
    mode: BackgroundProgressMode,
    tickMs: number,
    cap: number,
    kind: BackgroundTaskKind,
    expectedActiveMs: number,
  ): void {
    if (mode === 'synchronized') {
      return;
    }

    const expectedTicks = Math.max(8, Math.max(400, expectedActiveMs) / tickMs);
    const easingFactor = Math.min(0.14, Math.max(0.025, 2.8 / expectedTicks));

    this.progressTimer = setInterval(() => {
      if (mode === 'virtual') {
        const delta = Math.max(0.45, (cap - this.virtualCursor) * easingFactor);
        this.virtualCursor = Math.min(cap, this.virtualCursor + delta);
        const pct = Math.min(cap, Math.round(this.virtualCursor));
        this._progress.set(pct);
        this.advanceVirtualStage(kind, pct);
        return;
      }

      // Modo híbrido: ancora no avanço real do worker e desliza suavemente ao longo do tempo configurado.
      const hybridTarget = Math.min(cap, Math.max(this.syncedFloor + 18, 28));
      if (this.virtualCursor < hybridTarget) {
        const delta = Math.max(0.4, (hybridTarget - this.virtualCursor) * easingFactor);
        this.virtualCursor = Math.min(hybridTarget, this.virtualCursor + delta);
        const pct = Math.min(cap, Math.round(this.virtualCursor));
        if (pct > this._progress()) {
          this._progress.set(pct);
        }
      }
    }, tickMs);
  }

  private advanceVirtualStage(kind: BackgroundTaskKind, pct: number): void {
    if (kind === 'import_json') {
      if (pct >= 72) {
        this._stage.set('validating');
      } else if (pct >= 34) {
        this._stage.set('parsing');
      }
      return;
    }

    if (pct >= 76) {
      this._stage.set('packaging');
    } else if (pct >= 38) {
      this._stage.set('rendering');
    }
  }

  private stopProgressTicker(): void {
    if (this.progressTimer !== null) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  private async waitMs(ms: number): Promise<void> {
    if (ms <= 0) {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  private async ensureMinimumDisplayTime(
    startedAt: number,
    targetMinProcessingMs: number,
  ): Promise<void> {
    if (targetMinProcessingMs <= 0) {
      return;
    }
    const elapsedMs = Date.now() - startedAt;
    const remainingMs = targetMinProcessingMs - elapsedMs;
    if (remainingMs > 0) {
      await this.waitMs(remainingMs);
    }
  }

  private async tryRunWorkerTask(
    request: BackgroundWorkerRequest,
    onProgress: (stage: BackgroundTaskStage, progress: number) => void,
  ): Promise<BackgroundWorkerResultMessage | null> {
    const worker = this.ensureWorker();
    if (!worker) {
      return null;
    }

    this._usedBackgroundWorker.set(true);

    return new Promise<BackgroundWorkerResultMessage | null>((resolve) => {
      const cleanup = (): void => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
      };

      const handleMessage = (event: MessageEvent<BackgroundWorkerMessage>): void => {
        const payload = event.data;
        if (!payload || payload.requestId !== request.requestId) {
          return;
        }

        if (payload.type === 'progress') {
          onProgress(payload.stage, payload.progress);
          return;
        }

        cleanup();
        if (payload.type === 'result') {
          resolve(payload);
          return;
        }

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
        worker.postMessage(request);
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
}
