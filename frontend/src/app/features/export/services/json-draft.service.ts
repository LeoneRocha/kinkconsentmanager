import { inject, Injectable } from '@angular/core';
import {
  ChecklistDraft,
  DraftValidationResult,
  ExportResult,
  ItemResponseValue,
  SupportedLanguage,
} from '../../../core/models';
import { FileDownloadService } from './file-download.service';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

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
  parseAndValidateDraft(
    rawContent: string,
    expectedSchemaVersion: string,
  ): DraftValidationResult {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      return {
        valid: false,
        errors: ['Invalid JSON syntax.'],
      };
    }

    if (!isPlainObject(parsed)) {
      return {
        valid: false,
        errors: ['Draft payload must be a JSON object.'],
      };
    }

    const errors: string[] = [];

    const rawSchemaVersion = parsed['schemaVersion'];
    if (typeof rawSchemaVersion !== 'string' || rawSchemaVersion.trim().length === 0) {
      errors.push('Missing or invalid "schemaVersion" field.');
    } else {
      const actualMajor = this.extractMajorVersion(rawSchemaVersion);
      const expectedMajor = this.extractMajorVersion(expectedSchemaVersion);
      if (actualMajor === null || expectedMajor === null || actualMajor !== expectedMajor) {
        errors.push(
          `Incompatible schemaVersion "${rawSchemaVersion}" for expected version "${expectedSchemaVersion}".`,
        );
      }
    }

    const rawExportedAt = parsed['exportedAt'];
    if (typeof rawExportedAt !== 'string' || rawExportedAt.trim().length === 0) {
      errors.push('Missing or invalid "exportedAt" field.');
    }

    const rawAnswers = parsed['answers'];
    if (!isPlainObject(rawAnswers)) {
      errors.push('Missing or invalid "answers" object.');
    } else {
      for (const [itemId, value] of Object.entries(rawAnswers)) {
        if (!isPlainObject(value)) {
          errors.push(`Invalid answer object for item "${itemId}".`);
        }
      }
    }

    if (errors.length > 0) {
      return {
        valid: false,
        errors,
      };
    }

    const rawLanguage = parsed['language'];
    const language: SupportedLanguage =
      rawLanguage === 'pt-BR' || rawLanguage === 'en-US' ? rawLanguage : 'pt-BR';

    const validatedAnswers: Record<string, ItemResponseValue> = {};
    for (const [itemId, entry] of Object.entries(rawAnswers as Record<string, unknown>)) {
      validatedAnswers[itemId] = entry as ItemResponseValue;
    }

    return {
      valid: true,
      errors: [],
      draft: {
        schemaVersion: (rawSchemaVersion as string).trim(),
        exportedAt: (rawExportedAt as string).trim(),
        language,
        answers: validatedAnswers,
      },
    };
  }

  private extractMajorVersion(version: string): string | null {
    const match = /^\s*v?(\d+)(?:\.|$)/.exec(version);
    return match ? match[1] : null;
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
