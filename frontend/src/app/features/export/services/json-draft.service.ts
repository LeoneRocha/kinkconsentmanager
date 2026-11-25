import { inject, Injectable } from '@angular/core';
import { ChecklistDraft, DraftValidationResult, ExportResult } from '../../../core/models';
import { parseAndValidateDraftContent } from '../../../core/services';
import { FileDownloadService } from './file-download.service';

/**
 * Exports and validates portable JSON checklist drafts for backup and restoration.
 */
@Injectable({ providedIn: 'root' })
export class JsonDraftService {
  private readonly fileDownload = inject(FileDownloadService);

  /**
   * Serializes and downloads a checklist draft as a formatted JSON file.
   */
  exportDraft(draft: ChecklistDraft, filename?: string): ExportResult {
    const resolvedFilename = this.resolveFilename(filename);

    try {
      const json = JSON.stringify(draft, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      this.fileDownload.downloadBlob(blob, resolvedFilename);

      return {
        format: 'json',
        filename: resolvedFilename,
        success: true,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unexpected error during JSON draft export.';
      return {
        format: 'json',
        filename: resolvedFilename,
        success: false,
        errorMessage,
      };
    }
  }

  /**
   * Parses raw JSON text and validates structure and major schema version compatibility.
   */
  parseAndValidateDraft(rawContent: string, expectedSchemaVersion: string): DraftValidationResult {
    return parseAndValidateDraftContent(rawContent, expectedSchemaVersion);
  }

  private resolveFilename(filename?: string): string {
    const trimmed = filename?.trim();
    if (trimmed && trimmed.length > 0) {
      return trimmed.toLowerCase().endsWith('.json') ? trimmed : `${trimmed}.json`;
    }
    const dateStamp = new Date().toISOString().slice(0, 10);
    return `kink-consent-draft-${dateStamp}.json`;
  }
}
