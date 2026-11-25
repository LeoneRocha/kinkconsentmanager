import { InjectionToken } from '@angular/core';

export type DraftImportWorkerFactory = () => Worker | null;

/**
 * Provider factory desacoplado para instanciar o Web Worker de importação de rascunhos JSON.
 * Permite substituição direta em testes ou fallback em ambientes sem suporte a Web Workers.
 */
export const DRAFT_IMPORT_WORKER_FACTORY = new InjectionToken<DraftImportWorkerFactory>(
  'DRAFT_IMPORT_WORKER_FACTORY',
  {
    providedIn: 'root',
    factory: () => () =>
      typeof Worker !== 'undefined'
        ? new Worker(new URL('./draft-import.worker', import.meta.url), { type: 'module' })
        : null,
  },
);
