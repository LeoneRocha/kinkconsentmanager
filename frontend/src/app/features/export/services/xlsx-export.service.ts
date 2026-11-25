import { inject, Injectable } from '@angular/core';
import {
  ChecklistSchema,
  ExportResult,
  ExportSummaryLayout,
  FlattenedChecklistRow,
  ResolvedPreviewTexts,
} from '../../../core/models';
import {
  BackgroundTaskWorkerService,
  buildStyledXlsxWorkbook,
  XlsxExportLabels,
} from '../../../core/services';
import { FileDownloadService } from './file-download.service';

const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const DEFAULT_XLSX_LABELS: XlsxExportLabels = {
  itemHeader: 'Prática / Item',
  valueHeader: 'Resposta',
  legendTitle: 'Legenda da Escala',
  layoutLabel: 'Visualização Moderna',
};

/**
 * Generates styled Excel (`.xlsx`) workbooks mirroring the selected summary layout
 * (`modern` or `classic`), executed inside the isolated background Web Worker.
 */
@Injectable({ providedIn: 'root' })
export class XlsxExportService {
  private readonly backgroundWorker = inject(BackgroundTaskWorkerService);
  private readonly fileDownload = inject(FileDownloadService);

  /**
   * Constrói os bytes OOXML da planilha estilizada de forma síncrona (útil para testes e preview).
   */
  buildWorkbookBytes(
    schema: ChecklistSchema,
    rows: readonly FlattenedChecklistRow[],
    texts: ResolvedPreviewTexts,
    layout: ExportSummaryLayout = 'modern',
    labels: XlsxExportLabels = DEFAULT_XLSX_LABELS,
  ): Uint8Array {
    return buildStyledXlsxWorkbook({
      schema,
      rows,
      texts,
      layout,
      labels,
    });
  }

  /**
   * Gera a planilha Excel em segundo plano (Web Worker + fallback em memória) e dispara o download.
   */
  async exportXlsx(
    schema: ChecklistSchema,
    rows: readonly FlattenedChecklistRow[],
    texts: ResolvedPreviewTexts,
    filename?: string,
    layout: ExportSummaryLayout = 'modern',
    labels: XlsxExportLabels = DEFAULT_XLSX_LABELS,
  ): Promise<ExportResult> {
    const resolvedFilename = this.resolveFilename(filename);

    try {
      const outcome = await this.backgroundWorker.generateXlsxBytes(
        schema,
        rows,
        texts,
        layout,
        labels,
        resolvedFilename,
      );

      const bufferCopy = new ArrayBuffer(outcome.bytes.byteLength);
      new Uint8Array(bufferCopy).set(outcome.bytes);
      const blob = new Blob([bufferCopy], { type: XLSX_MIME_TYPE });
      this.fileDownload.downloadBlob(blob, resolvedFilename);

      return {
        format: 'xlsx',
        filename: resolvedFilename,
        success: true,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unexpected error during XLSX generation.';
      return {
        format: 'xlsx',
        filename: resolvedFilename,
        success: false,
        errorMessage,
      };
    }
  }

  private resolveFilename(filename?: string): string {
    const trimmed = filename?.trim();
    if (trimmed && trimmed.length > 0) {
      return trimmed.toLowerCase().endsWith('.xlsx') ? trimmed : `${trimmed}.xlsx`;
    }
    const dateStamp = new Date().toISOString().slice(0, 10);
    return `kink-consent-checklist-${dateStamp}.xlsx`;
  }
}
