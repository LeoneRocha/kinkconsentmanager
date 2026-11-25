import { inject, Injectable, InjectionToken } from '@angular/core';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import {
  ChecklistSchema,
  ExportResult,
  ExportSummaryLayout,
  FlattenedChecklistRow,
  ResolvedPreviewTexts,
} from '../../../core/models';
import { BackgroundTaskWorkerService, buildPdfDocumentDefinition } from '../../../core/services';
import { FileDownloadService } from './file-download.service';

export interface PdfCreatedDocument {
  download(defaultFileName?: string): Promise<void> | void;
}

export interface PdfMakerInstance {
  createPdf(documentDefinitions: TDocumentDefinitions): PdfCreatedDocument;
}

export type PdfMakerLoaderFn = () => Promise<PdfMakerInstance>;

interface PdfModuleShape {
  readonly default?: PdfModuleShape;
  createPdf?: (documentDefinitions: TDocumentDefinitions) => PdfCreatedDocument;
  addVirtualFileSystem?: (vfs: Record<string, string>) => void;
}

interface VfsModuleShape {
  readonly default?: Record<string, string>;
}

/**
 * Injectable pdfmake loader performing lazy bundle loading and VFS font initialization.
 */
export const PDF_MAKER_LOADER = new InjectionToken<PdfMakerLoaderFn>('PDF_MAKER_LOADER', {
  providedIn: 'root',
  factory: () => async (): Promise<PdfMakerInstance> => {
    const pdfMakeMod = (await import('pdfmake/build/pdfmake')) as unknown as PdfModuleShape;
    const vfsMod = (await import('pdfmake/build/vfs_fonts')) as unknown as VfsModuleShape &
      Record<string, string>;
    const pdfMake = pdfMakeMod.default ?? pdfMakeMod;
    const vfs = vfsMod.default ?? vfsMod;

    if (typeof pdfMake.addVirtualFileSystem === 'function') {
      pdfMake.addVirtualFileSystem(vfs as Record<string, string>);
    }

    if (typeof pdfMake.createPdf !== 'function') {
      throw new Error('pdfmake createPdf API could not be initialized.');
    }

    return pdfMake as PdfMakerInstance;
  },
});

/**
 * Generates multi-page vector PDF documents offloaded to a background Web Worker when available,
 * with automatic fallback to lazy-loaded `pdfmake` on the main thread.
 */
@Injectable({ providedIn: 'root' })
export class PdfExportService {
  private readonly pdfMakerLoader = inject(PDF_MAKER_LOADER);
  private readonly backgroundWorker = inject(BackgroundTaskWorkerService);
  private readonly fileDownload = inject(FileDownloadService);

  /**
   * Builds the declarative pdfmake document definition with header, scale legend,
   * per-group non-breaking tables, and dynamic page-numbered footer.
   */
  buildDocumentDefinition(
    schema: ChecklistSchema,
    rows: readonly FlattenedChecklistRow[],
    texts: ResolvedPreviewTexts,
    layout: ExportSummaryLayout = 'modern',
  ): TDocumentDefinitions {
    return buildPdfDocumentDefinition(schema, rows, texts, layout);
  }

  /**
   * Generates and triggers a browser download of the checklist PDF report.
   */
  async exportPdf(
    schema: ChecklistSchema,
    rows: readonly FlattenedChecklistRow[],
    texts: ResolvedPreviewTexts,
    filename?: string,
    layout: ExportSummaryLayout = 'modern',
  ): Promise<ExportResult> {
    const resolvedFilename = this.resolveFilename(filename);

    try {
      const workerOutcome = await this.backgroundWorker.generatePdfBytes(
        schema,
        rows,
        texts,
        layout,
        resolvedFilename,
      );

      if (workerOutcome !== null) {
        const bufferCopy = new ArrayBuffer(workerOutcome.bytes.byteLength);
        new Uint8Array(bufferCopy).set(workerOutcome.bytes);
        const blob = new Blob([bufferCopy], { type: 'application/pdf' });
        this.fileDownload.downloadBlob(blob, resolvedFilename);

        return {
          format: 'pdf',
          filename: resolvedFilename,
          success: true,
        };
      }

      const docDef = this.buildDocumentDefinition(schema, rows, texts, layout);
      const pdfMake = await this.pdfMakerLoader();
      await pdfMake.createPdf(docDef).download(resolvedFilename);

      return {
        format: 'pdf',
        filename: resolvedFilename,
        success: true,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unexpected error during PDF generation.';
      return {
        format: 'pdf',
        filename: resolvedFilename,
        success: false,
        errorMessage,
      };
    }
  }

  private resolveFilename(filename?: string): string {
    const trimmed = filename?.trim();
    if (trimmed && trimmed.length > 0) {
      return trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
    }
    const dateStamp = new Date().toISOString().slice(0, 10);
    return `kink-consent-checklist-${dateStamp}.pdf`;
  }
}
