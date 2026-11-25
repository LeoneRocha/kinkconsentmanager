import { InjectionToken } from '@angular/core';

export type DraftImportWorkerFactory = () => Worker | null;

/**
 * Versão de teste (Jest) sem referência a `import.meta.url`, retornando `null` por padrão
 * para acionar o fallback síncrono/assíncrono controlado ou permitir mock via DI.
 */
export const DRAFT_IMPORT_WORKER_FACTORY = new InjectionToken<DraftImportWorkerFactory>(
  'DRAFT_IMPORT_WORKER_FACTORY',
  {
    providedIn: 'root',
    factory: () => () => null,
  },
);
