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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
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
