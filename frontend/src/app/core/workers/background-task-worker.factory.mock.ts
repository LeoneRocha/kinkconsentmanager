import { InjectionToken } from '@angular/core';

export type BackgroundTaskWorkerFactory = () => Worker | null;
export type DraftImportWorkerFactory = BackgroundTaskWorkerFactory;

/**
 * Versão de teste (Jest) sem referência a `import.meta.url`, retornando `null` por padrão
 * para acionar o fallback síncrono/assíncrono controlado ou permitir mock via DI.
 */
export const BACKGROUND_TASK_WORKER_FACTORY = new InjectionToken<BackgroundTaskWorkerFactory>(
  'BACKGROUND_TASK_WORKER_FACTORY',
  {
    providedIn: 'root',
    factory: () => () => null,
  },
);

export const DRAFT_IMPORT_WORKER_FACTORY = BACKGROUND_TASK_WORKER_FACTORY;
