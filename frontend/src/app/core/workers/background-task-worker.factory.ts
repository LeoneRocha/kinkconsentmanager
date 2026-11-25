import { InjectionToken } from '@angular/core';

export type BackgroundTaskWorkerFactory = () => Worker | null;
export type DraftImportWorkerFactory = BackgroundTaskWorkerFactory;

/**
 * Provider factory desacoplado para instanciar o Web Worker de processamento em background.
 * Permite substituição direta em testes ou fallback em ambientes sem suporte a Web Workers.
 */
export const BACKGROUND_TASK_WORKER_FACTORY = new InjectionToken<BackgroundTaskWorkerFactory>(
  'BACKGROUND_TASK_WORKER_FACTORY',
  {
    providedIn: 'root',
    factory: () => () =>
      typeof Worker !== 'undefined'
        ? new Worker(new URL('./background-tasks.worker', import.meta.url), { type: 'module' })
        : null,
  },
);

export const DRAFT_IMPORT_WORKER_FACTORY = BACKGROUND_TASK_WORKER_FACTORY;
