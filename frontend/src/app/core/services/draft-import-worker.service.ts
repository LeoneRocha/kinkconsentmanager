import { inject, Injectable, OnDestroy } from '@angular/core';
import { DraftValidationResult } from '../models';
import {
  BackgroundDraftImportOutcome,
  BackgroundTaskWorkerService,
} from './background-task-worker.service';
import { BackgroundTaskOptions } from '../workers';

export type DraftImportProcessOutcome = BackgroundDraftImportOutcome;
export type DraftImportOptions = BackgroundTaskOptions;

/**
 * Facade compatível com chamadores existentes para importação de rascunhos JSON em background,
 * delegando ao `BackgroundTaskWorkerService` unificado.
 */
@Injectable({ providedIn: 'root' })
export class DraftImportWorkerService implements OnDestroy {
  private readonly backgroundWorker = inject(BackgroundTaskWorkerService);

  readonly isProcessing = this.backgroundWorker.isProcessing;
  readonly isCompleted = this.backgroundWorker.isCompleted;
  readonly progressMode = this.backgroundWorker.progressMode;
  readonly taskKind = this.backgroundWorker.taskKind;
  readonly stage = this.backgroundWorker.stage;
  readonly progress = this.backgroundWorker.progress;
  readonly fileName = this.backgroundWorker.fileName;
  readonly usedBackgroundWorker = this.backgroundWorker.usedBackgroundWorker;

  importDraftFile(
    file: File,
    expectedSchemaVersion: string,
    options?: DraftImportOptions,
  ): Promise<DraftImportProcessOutcome> {
    return this.backgroundWorker.importDraftFile(file, expectedSchemaVersion, options);
  }

  validateRawContent(rawContent: string, expectedSchemaVersion: string): DraftValidationResult {
    return this.backgroundWorker.validateRawContent(rawContent, expectedSchemaVersion);
  }

  ngOnDestroy(): void {
    this.backgroundWorker.terminateWorker();
  }
}
