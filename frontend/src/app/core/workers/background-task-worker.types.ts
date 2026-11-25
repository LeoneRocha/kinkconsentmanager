import {
  ChecklistSchema,
  ExportSummaryLayout,
  FlattenedChecklistRow,
  ResolvedPreviewTexts,
} from '../models';
import { DraftImportProcessSummary, DraftImportWorkerStage } from './draft-import.processor';
import { CsvExportContext } from './csv-export.processor';
import { XlsxExportLabels } from './xlsx/xlsx-workbook.types';

export type BackgroundTaskKind =
  'import_json' | 'export_png' | 'export_pdf' | 'export_xlsx' | 'export_csv';

export type BackgroundTaskStage =
  DraftImportWorkerStage | 'preparing' | 'building' | 'rendering' | 'packaging';

export type BackgroundProgressMode = 'synchronized' | 'virtual' | 'hybrid';

export interface BackgroundTaskTimingConfig {
  readonly startDelayMs: number;
  readonly minProcessingMs: number;
  readonly completionDelayMs: number;
  readonly progressTickMs: number;
  readonly virtualProgressCap: number;
}

export interface BackgroundTaskOptions {
  readonly minDisplayMs?: number;
  readonly startDelayMs?: number;
  readonly completionDelayMs?: number;
  readonly progressMode?: BackgroundProgressMode;
  readonly progressTickMs?: number;
}

export interface TrackedBackgroundTaskConfig<T> {
  readonly kind: BackgroundTaskKind;
  readonly fileName: string;
  readonly initialStage?: BackgroundTaskStage;
  readonly options?: BackgroundTaskOptions;
  readonly shouldShowCompletion?: (result: T) => boolean;
  readonly run: (
    reportProgress: (stage: BackgroundTaskStage, progress: number) => void,
  ) => Promise<T>;
}

export interface ImportJsonWorkerRequest {
  readonly task?: 'import_json';
  readonly requestId: string;
  readonly file?: File;
  readonly rawContent?: string;
  readonly expectedSchemaVersion: string;
}

export interface ExportPdfWorkerRequest {
  readonly task: 'export_pdf';
  readonly requestId: string;
  readonly schema: ChecklistSchema;
  readonly rows: readonly FlattenedChecklistRow[];
  readonly texts: ResolvedPreviewTexts;
  readonly layout: ExportSummaryLayout;
}

export interface ExportXlsxWorkerRequest {
  readonly task: 'export_xlsx';
  readonly requestId: string;
  readonly schema: ChecklistSchema;
  readonly rows: readonly FlattenedChecklistRow[];
  readonly texts: ResolvedPreviewTexts;
  readonly layout: ExportSummaryLayout;
  readonly labels: XlsxExportLabels;
}

export interface ExportCsvWorkerRequest {
  readonly task: 'export_csv';
  readonly requestId: string;
  readonly rows: readonly FlattenedChecklistRow[];
  readonly context?: CsvExportContext;
}

export type BackgroundWorkerRequest =
  | ImportJsonWorkerRequest
  | ExportPdfWorkerRequest
  | ExportXlsxWorkerRequest
  | ExportCsvWorkerRequest;

export interface BackgroundWorkerProgressMessage {
  readonly type: 'progress';
  readonly requestId: string;
  readonly stage: BackgroundTaskStage;
  readonly progress: number;
}

export interface BackgroundWorkerResultMessage {
  readonly type: 'result';
  readonly requestId: string;
  readonly task?: BackgroundTaskKind;
  readonly summary?: DraftImportProcessSummary;
  readonly buffer?: ArrayBuffer;
  readonly textContent?: string;
}

export interface BackgroundWorkerErrorMessage {
  readonly type: 'error';
  readonly requestId: string;
  readonly message: string;
}

export type BackgroundWorkerMessage =
  BackgroundWorkerProgressMessage | BackgroundWorkerResultMessage | BackgroundWorkerErrorMessage;

export interface BackgroundBinaryOutcome {
  readonly bytes: Uint8Array;
  readonly processedInWorker: boolean;
}

export interface BackgroundTextOutcome {
  readonly textContent: string;
  readonly processedInWorker: boolean;
}
