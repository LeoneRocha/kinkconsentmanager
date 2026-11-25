import { inject, Injectable } from '@angular/core';
import { ExportResult, FlattenedChecklistRow } from '../../../core/models';
import {
  BackgroundTaskWorkerService,
  buildCsvContentFromRows,
  CsvExportContext,
} from '../../../core/services';
import { FileDownloadService } from './file-download.service';

/**
 * Generates RFC-4180 compliant, UTF-8 BOM encoded CSV exports mirroring the Excel report layout.
 */
@Injectable({ providedIn: 'root' })
export class CsvExportService {
  private readonly fileDownload = inject(FileDownloadService);
  private readonly backgroundWorker = inject(BackgroundTaskWorkerService);

  /**
   * Builds UTF-8 BOM prefixed RFC-4180 CSV content for the provided rows and optional Excel-like context.
   */
  buildCsvContent(rows: readonly FlattenedChecklistRow[], context?: CsvExportContext): string {
    return buildCsvContentFromRows(rows, context);
  }

  /**
   * Builds and triggers download of the checklist CSV file synchronously.
   */
  exportCsv(
    rows: readonly FlattenedChecklistRow[],
    filename?: string,
    context?: CsvExportContext,
  ): ExportResult {
    const resolvedFilename = this.resolveFilename(filename);

    try {
      const csvContent = this.buildCsvContent(rows, context);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      this.fileDownload.downloadBlob(blob, resolvedFilename);

      return {
        format: 'csv',
        filename: resolvedFilename,
        success: true,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unexpected error during CSV export.';
      return {
        format: 'csv',
        filename: resolvedFilename,
        success: false,
        errorMessage,
      };
    }
  }

  /**
   * Gera e baixa o CSV em segundo plano via Web Worker (com fallback em memória).
   */
  async exportCsvInBackground(
    rows: readonly FlattenedChecklistRow[],
    filename?: string,
    context?: CsvExportContext,
  ): Promise<ExportResult> {
    const resolvedFilename = this.resolveFilename(filename);

    try {
      const outcome = await this.backgroundWorker.generateCsvContent(
        rows,
        resolvedFilename,
        undefined,
        context,
      );
      const blob = new Blob([outcome.textContent], { type: 'text/csv;charset=utf-8' });
      this.fileDownload.downloadBlob(blob, resolvedFilename);

      return {
        format: 'csv',
        filename: resolvedFilename,
        success: true,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unexpected error during CSV export.';
      return {
        format: 'csv',
        filename: resolvedFilename,
        success: false,
        errorMessage,
      };
    }
  }

  private resolveFilename(filename?: string): string {
    const trimmed = filename?.trim();
    if (trimmed && trimmed.length > 0) {
      return trimmed.toLowerCase().endsWith('.csv') ? trimmed : `${trimmed}.csv`;
    }
    const dateStamp = new Date().toISOString().slice(0, 10);
    return `kink-consent-checklist-${dateStamp}.csv`;
  }
}
