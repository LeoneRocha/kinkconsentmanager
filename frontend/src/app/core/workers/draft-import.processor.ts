import { DraftValidationResult, ItemResponseValue, SupportedLanguage } from '../models';

export type DraftImportWorkerStage = 'reading' | 'parsing' | 'validating' | 'complete';

export interface DraftImportWorkerRequest {
  readonly requestId: string;
  readonly expectedSchemaVersion: string;
  readonly file?: File;
  readonly rawContent?: string;
}

export interface DraftImportProcessSummary {
  readonly validation: DraftValidationResult;
  readonly durationMs: number;
  readonly answeredCount: number;
}

export type DraftImportWorkerMessage =
  | {
      readonly type: 'progress';
      readonly requestId: string;
      readonly stage: DraftImportWorkerStage;
      readonly progress: number;
    }
  | {
      readonly type: 'result';
      readonly requestId: string;
      readonly summary: DraftImportProcessSummary;
    }
  | {
      readonly type: 'error';
      readonly requestId: string;
      readonly message: string;
    };

const FORBIDDEN_KEYS = new Set<string>(['__proto__', 'constructor', 'prototype']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeAnswerEntry(
  itemId: string,
  raw: Record<string, unknown>,
  errors: string[],
): ItemResponseValue | null {
  const cleaned: {
    primaryScale?: ItemResponseValue['primaryScale'];
    secondaryScale?: ItemResponseValue['secondaryScale'];
    selectedOption?: string;
    selectedOptions?: readonly string[];
    otherText?: string;
    customText?: string;
  } = {};

  const stringFields = [
    'primaryScale',
    'secondaryScale',
    'selectedOption',
    'otherText',
    'customText',
  ] as const;

  for (const field of stringFields) {
    const value = raw[field];
    if (value === undefined) {
      continue;
    }
    if (typeof value !== 'string') {
      errors.push(`Invalid "${field}" value for item "${itemId}".`);
      continue;
    }
    if (value.length > 0) {
      (cleaned as Record<string, unknown>)[field] = value;
    }
  }

  const rawSelectedOptions = raw['selectedOptions'];
  if (rawSelectedOptions !== undefined) {
    if (
      !Array.isArray(rawSelectedOptions) ||
      !rawSelectedOptions.every((entry) => typeof entry === 'string')
    ) {
      errors.push(`Invalid "selectedOptions" array for item "${itemId}".`);
    } else {
      const validOptions = rawSelectedOptions.filter((entry) => entry.length > 0);
      if (validOptions.length > 0) {
        cleaned.selectedOptions = validOptions;
      }
    }
  }

  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

function extractMajorVersion(version: string): string | null {
  const match = /^\s*v?(\d+)(?:\.|$)/.exec(version);
  return match ? match[1] : null;
}

async function readTextFromFile(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text();
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('Failed to read selected file.'));
    };
    reader.readAsText(file, 'utf-8');
  });
}

/**
 * Faz o parse do texto JSON bruto e valida sua estrutura e compatibilidade de versão principal do schema.
 */
export function parseAndValidateDraftContent(
  rawContent: string,
  expectedSchemaVersion: string,
): DraftValidationResult {
  const normalizedContent = rawContent.replace(/^\uFEFF/, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(normalizedContent);
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
    const actualMajor = extractMajorVersion(rawSchemaVersion);
    const expectedMajor = extractMajorVersion(expectedSchemaVersion);
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
  const validatedAnswers: Record<string, ItemResponseValue> = {};
  if (!isPlainObject(rawAnswers)) {
    errors.push('Missing or invalid "answers" object.');
  } else {
    for (const [itemId, value] of Object.entries(rawAnswers)) {
      if (FORBIDDEN_KEYS.has(itemId) || itemId.trim().length === 0) {
        continue;
      }
      if (!isPlainObject(value)) {
        errors.push(`Invalid answer object for item "${itemId}".`);
        continue;
      }
      const sanitized = sanitizeAnswerEntry(itemId, value, errors);
      if (sanitized !== null) {
        validatedAnswers[itemId] = sanitized;
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

/**
 * Executa o pipeline de leitura, parse e validação do rascunho JSON com reporte de progresso por etapa.
 * Usado tanto no Web Worker dedicado quanto no fallback em memória quando Workers não estiverem disponíveis.
 */
export async function processDraftImportPayload(
  request: DraftImportWorkerRequest,
  onProgress?: (stage: DraftImportWorkerStage, progress: number) => void,
): Promise<DraftImportProcessSummary> {
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

  onProgress?.('reading', 20);
  const rawContent =
    typeof request.rawContent === 'string'
      ? request.rawContent
      : request.file
        ? await readTextFromFile(request.file)
        : '';

  onProgress?.('parsing', 55);
  const validation = parseAndValidateDraftContent(rawContent, request.expectedSchemaVersion);

  onProgress?.('validating', 85);
  const answeredCount = validation.draft ? Object.keys(validation.draft.answers).length : 0;

  onProgress?.('complete', 100);
  const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

  return {
    validation,
    durationMs: Math.max(0, Math.round(endedAt - startedAt)),
    answeredCount,
  };
}
