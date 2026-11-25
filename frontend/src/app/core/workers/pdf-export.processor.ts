import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { BackgroundTaskStage, ExportPdfWorkerRequest } from './background-task-worker.types';
import { buildPdfDocumentDefinition } from './pdf-document.builder';

export interface WorkerPdfCreatedDocument {
  getBuffer?: () => Promise<Uint8Array>;
}

export interface WorkerPdfMakerInstance {
  createPdf?: (docDef: TDocumentDefinitions) => WorkerPdfCreatedDocument;
  addVirtualFileSystem?: (vfs: Record<string, string>) => void;
}

export type WorkerPdfLoaderFn = () => Promise<WorkerPdfMakerInstance>;

interface WorkerPdfModuleShape {
  readonly default?: WorkerPdfMakerInstance;
  createPdf?: (docDef: TDocumentDefinitions) => WorkerPdfCreatedDocument;
  addVirtualFileSystem?: (vfs: Record<string, string>) => void;
}

interface WorkerVfsModuleShape {
  readonly default?: Record<string, string>;
}

let cachedPdfMakePromise: Promise<WorkerPdfMakerInstance> | null = null;

/**
 * Carrega `pdfmake` e fontes virtuais de forma lazy e isolada no contexto do worker.
 */
export async function loadPdfMakerInWorker(): Promise<WorkerPdfMakerInstance> {
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

/**
 * Processador específico para geração de PDF em segundo plano a partir de `ExportPdfWorkerRequest`.
 */
export async function processPdfExportPayload(
  request: ExportPdfWorkerRequest,
  onProgress?: (stage: BackgroundTaskStage, progress: number) => void,
  pdfLoader: WorkerPdfLoaderFn = loadPdfMakerInWorker,
): Promise<Uint8Array> {
  onProgress?.('preparing', 20);
  const pdfMake = await pdfLoader();

  onProgress?.('building', 45);
  const docDef = buildPdfDocumentDefinition(
    request.schema,
    request.rows,
    request.texts,
    request.layout,
  );

  onProgress?.('rendering', 75);
  const created = pdfMake.createPdf?.(docDef);
  if (!created || typeof created.getBuffer !== 'function') {
    throw new Error('pdfmake getBuffer API is unavailable inside worker.');
  }

  const rawBytes = await created.getBuffer();
  onProgress?.('complete', 100);
  return rawBytes;
}
