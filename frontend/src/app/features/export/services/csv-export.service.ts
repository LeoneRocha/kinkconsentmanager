import { inject, Injectable } from '@angular/core';
import { ExportResult, FlattenedChecklistRow } from '../../../core/models';
import { FileDownloadService } from './file-download.service';

const UTF8_BOM = '\uFEFF';
const CSV_HEADERS: readonly string[] = [
  'Group_ID',
  'Category',
  'Item_ID',
  'Item_Label',
  'Role_Mode',
  'Giving_Or_Primary_Response',
  'Receiving_Or_Secondary_Response',
  'Selected_Options',
  'Custom_Note',
];

/**
 * Generates RFC-4180 compliant, UTF-8 BOM encoded CSV exports from flattened checklist rows.
 */
@Injectable({ providedIn: 'root' })
export class CsvExportService {
  private readonly fileDownload = inject(FileDownloadService);

  /**
   * Builds UTF-8 BOM prefixed RFC-4180 CSV content for the provided rows.
   */
  buildCsvContent(rows: readonly FlattenedChecklistRow[]): string {
    const lines: string[] = [CSV_HEADERS.join(',')];

    for (const row of rows) {
      const cells = [
        row.groupId,
        row.groupTitle,
        row.itemId,
        row.itemLabel,
        row.isDualRole ? 'dual' : 'single',
        row.primaryValueLabel,
        row.isDualRole ? (row.secondaryValueLabel ?? '') : '',
        row.selectedOptionsLabels.join('; '),
        row.customNote,
      ];
      lines.push(cells.map((cell) => this.escapeCell(cell)).join(','));
    }

    return `${UTF8_BOM}${lines.join('\r\n')}`;
  }

  /**
   * Builds and triggers download of the checklist CSV file.
   */
  exportCsv(rows: readonly FlattenedChecklistRow[], filename?: string): ExportResult {
    const resolvedFilename = this.resolveFilename(filename);

    try {
      const csvContent = this.buildCsvContent(rows);
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

  private escapeCell(value: string): string {
    const normalized = value ?? '';
    if (
      normalized.includes(',') ||
      normalized.includes('"') ||
      normalized.includes('\r') ||
      normalized.includes('\n')
    ) {
      return `"${normalized.replace(/"/g, '""')}"`;
    }
    return normalized;
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
