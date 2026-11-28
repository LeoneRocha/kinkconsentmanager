import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, take } from 'rxjs';
import { CloudChecklistDto, ItemResponseValue, UpsertCloudChecklistRequest } from '../models';
import { BROWSER_STORAGE_REPOSITORY_TOKEN } from '../repositories';
import { ChecklistCloudApiService } from './checklist-cloud-api.service';
import {
  ChecklistEncryptedAutosavePayload,
  ChecklistLocalAutosaveService,
} from './checklist-local-autosave.service';
import { ChecklistStateService } from './checklist-state.service';
import { I18nService } from './i18n.service';
import { UiFeedbackHostService } from './ui-feedback-host.service';

export const CHECKLIST_ONLINE_AUTOSAVE_ENABLED_KEY = 'kcm_checklist_online_autosave_enabled_v1';

export interface ChecklistCloudSaveResult {
  readonly saved: boolean;
  readonly savedAt: string | null;
  readonly reloadedFromCloud?: boolean;
}

export interface ChecklistCloudRestoreResult {
  readonly restored: boolean;
  readonly savedAt: string | null;
}

/**
 * Serviço dedicado à persistência on-line do checklist na tabela `kink_consent."UserKinkCheclists"`
 * via `ChecklistCloudApiService`, gerenciando concorrência otimista (`409`), reconciliação no login e remoção remota.
 * Nunca grava respostas de usuários autenticados em `localStorage`.
 */
@Injectable({ providedIn: 'root' })
export class ChecklistCloudAutosaveService {
  private readonly checklistState = inject(ChecklistStateService);
  private readonly i18n = inject(I18nService);
  private readonly cloudApi = inject(ChecklistCloudApiService);
  private readonly localAutosave = inject(ChecklistLocalAutosaveService);
  private readonly storageRepository = inject(BROWSER_STORAGE_REPOSITORY_TOKEN);
  private readonly feedbackHost = inject(UiFeedbackHostService);

  private readonly enabledSignal = signal<boolean>(this.readInitialEnabled());
  private readonly remoteVersionSignal = signal<number | null>(null);
  private readonly syncErrorSignal = signal<boolean>(false);
  private readonly isRestoringSignal = signal<boolean>(false);

  private hasAttemptedRestore = false;
  private restoreInFlightPromise: Promise<ChecklistCloudRestoreResult> | null = null;

  readonly isEnabled = this.enabledSignal.asReadonly();
  readonly remoteVersion = this.remoteVersionSignal.asReadonly();
  readonly syncError = this.syncErrorSignal.asReadonly();
  readonly isRestoring = this.isRestoringSignal.asReadonly();

  /**
   * Habilita ou desabilita o salvamento automático on-line e persiste apenas a preferência booleana do usuário.
   */
  setEnabled(enabled: boolean): void {
    this.enabledSignal.set(enabled);
    this.storageRepository.set(CHECKLIST_ONLINE_AUTOSAVE_ENABLED_KEY, enabled, undefined, 'local');
  }

  /**
   * Envia o preenchimento atual para `PUT /api/v1/checklists/current` com concorrência otimista.
   */
  async save(options?: { readonly forceOverwrite?: boolean }): Promise<ChecklistCloudSaveResult> {
    const expectedVersion = options?.forceOverwrite ? null : this.remoteVersionSignal();

    try {
      return await this.uploadPayloadToCloud(expectedVersion);
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        const useOnline = await this.promptSyncConflictChoice();
        if (useOnline) {
          const reloadedAt = await this.reloadRemoteChecklist();
          return { saved: false, savedAt: reloadedAt, reloadedFromCloud: true };
        }

        try {
          return await this.uploadPayloadToCloud(null);
        } catch {
          this.syncErrorSignal.set(true);
          return { saved: false, savedAt: null };
        }
      }

      this.syncErrorSignal.set(true);
      return { saved: false, savedAt: null };
    }
  }

  /**
   * Hidrata as respostas da nuvem (`GET /api/v1/checklists/current`), migrando eventual rascunho
   * anônimo quando o banco está vazio ou solicitando escolha em caso de divergência.
   */
  async restore(options?: { readonly force?: boolean }): Promise<ChecklistCloudRestoreResult> {
    if (options?.force) {
      this.hasAttemptedRestore = false;
    }

    if (this.restoreInFlightPromise) {
      return this.restoreInFlightPromise;
    }

    if (this.hasAttemptedRestore) {
      const hasAnswers = Object.keys(this.checklistState.answers()).length > 0;
      return {
        restored: hasAnswers,
        savedAt: this.checklistState.lastUpdatedAt(),
      };
    }

    this.restoreInFlightPromise = this.executeRestore().finally(() => {
      this.restoreInFlightPromise = null;
    });

    return this.restoreInFlightPromise;
  }

  /**
   * Exclui de forma idempotente o registro remoto em `DELETE /api/v1/checklists/current`.
   */
  async deleteRemote(): Promise<boolean> {
    try {
      await firstValueFrom(this.cloudApi.deleteCurrentChecklist());
      this.remoteVersionSignal.set(null);
      this.syncErrorSignal.set(false);
      return true;
    } catch {
      this.syncErrorSignal.set(true);
      return false;
    }
  }

  /**
   * Limpa o estado de sincronização remota ao encerrar a sessão autenticada.
   */
  resetSessionState(): void {
    this.remoteVersionSignal.set(null);
    this.syncErrorSignal.set(false);
    this.isRestoringSignal.set(false);
    this.hasAttemptedRestore = false;
  }

  private async executeRestore(): Promise<ChecklistCloudRestoreResult> {
    this.hasAttemptedRestore = true;
    this.isRestoringSignal.set(true);

    try {
      const remotePromise = firstValueFrom(this.cloudApi.getCurrentChecklist());
      const localDraft = await this.readPendingAnonymousDraft();
      const remote = await remotePromise;

      if (!remote) {
        return await this.handleMissingRemoteChecklist(localDraft);
      }

      return await this.reconcileRemoteChecklist(remote, localDraft);
    } catch {
      this.hasAttemptedRestore = false;
      return { restored: false, savedAt: null };
    } finally {
      this.isRestoringSignal.set(false);
    }
  }

  private async handleMissingRemoteChecklist(
    localDraft: ChecklistEncryptedAutosavePayload | null,
  ): Promise<ChecklistCloudRestoreResult> {
    if (localDraft && Object.keys(localDraft.answers).length > 0) {
      this.ensureDraftAppliedToState(localDraft);
      const uploadResult = await this.uploadPayloadToCloud(null);
      if (uploadResult.saved) {
        this.localAutosave.clear();
        return { restored: true, savedAt: uploadResult.savedAt };
      }
      return { restored: false, savedAt: null };
    }

    this.localAutosave.clear();
    this.remoteVersionSignal.set(null);
    return { restored: false, savedAt: null };
  }

  private async reconcileRemoteChecklist(
    remote: CloudChecklistDto,
    localDraft: ChecklistEncryptedAutosavePayload | null,
  ): Promise<ChecklistCloudRestoreResult> {
    const remoteAnswers = this.parseAnswersJson(remote.answersJson);
    const hasLocalAnswers = Boolean(localDraft && Object.keys(localDraft.answers).length > 0);
    const remoteTimestamp = remote.updatedAt || remote.clientUpdatedAtUtc;

    if (!hasLocalAnswers) {
      this.applyRemoteChecklist(remote, remoteAnswers);
      this.localAutosave.clear();
      return {
        restored: Object.keys(remoteAnswers).length > 0,
        savedAt: remoteTimestamp ?? null,
      };
    }

    if (JSON.stringify(localDraft!.answers) === JSON.stringify(remoteAnswers)) {
      this.remoteVersionSignal.set(remote.version);
      this.syncErrorSignal.set(false);
      this.localAutosave.clear();
      return {
        restored: true,
        savedAt: remoteTimestamp ?? null,
      };
    }

    const useOnline = await this.promptSyncConflictChoice();
    let finalSavedAt: string | null = remoteTimestamp ?? null;

    if (useOnline) {
      this.applyRemoteChecklist(remote, remoteAnswers);
    } else {
      this.ensureDraftAppliedToState(localDraft!);
      const uploadResult = await this.uploadPayloadToCloud(remote.version);
      finalSavedAt = uploadResult.savedAt;
    }

    this.localAutosave.clear();
    return {
      restored: Object.keys(this.checklistState.answers()).length > 0,
      savedAt: finalSavedAt,
    };
  }

  private async uploadPayloadToCloud(
    expectedVersion: number | null,
  ): Promise<ChecklistCloudSaveResult> {
    const draft = this.checklistState.exportDraftSnapshot(this.i18n.currentLang());
    const request: UpsertCloudChecklistRequest = {
      schemaVersion: draft.schemaVersion,
      language: draft.language,
      answersJson: JSON.stringify(draft.answers),
      clientUpdatedAtUtc: new Date().toISOString(),
      expectedVersion,
    };

    const savedDto = await firstValueFrom(this.cloudApi.upsertCurrentChecklist(request));
    const savedAt = savedDto.updatedAt || savedDto.clientUpdatedAtUtc || request.clientUpdatedAtUtc;
    this.remoteVersionSignal.set(savedDto.version);
    this.syncErrorSignal.set(false);
    return { saved: true, savedAt };
  }

  private async reloadRemoteChecklist(): Promise<string | null> {
    try {
      const remote = await firstValueFrom(this.cloudApi.getCurrentChecklist());
      if (remote) {
        this.applyRemoteChecklist(remote, this.parseAnswersJson(remote.answersJson));
        return remote.updatedAt || remote.clientUpdatedAtUtc || null;
      }
      return null;
    } catch {
      this.syncErrorSignal.set(true);
      return null;
    }
  }

  private async readPendingAnonymousDraft(): Promise<ChecklistEncryptedAutosavePayload | null> {
    const inMemoryAnswers = this.checklistState.answers();
    if (Object.keys(inMemoryAnswers).length > 0) {
      return {
        schemaVersion: this.checklistState.state().schemaVersion,
        savedAt: this.checklistState.lastUpdatedAt() ?? new Date().toISOString(),
        language: this.i18n.currentLang(),
        viewMode: this.checklistState.viewMode(),
        activeCategoryIndex: this.checklistState.activeCategoryIndex(),
        answers: inMemoryAnswers,
      };
    }

    return this.localAutosave.readEncryptedDraft();
  }

  private ensureDraftAppliedToState(draft: ChecklistEncryptedAutosavePayload): void {
    if (Object.keys(this.checklistState.answers()).length > 0) {
      return;
    }
    this.checklistState.restoreFromEncryptedAutosave({
      schemaVersion: draft.schemaVersion,
      answers: draft.answers,
      viewMode: draft.viewMode,
      activeCategoryIndex: draft.activeCategoryIndex,
      savedAt: draft.savedAt,
    });
  }

  private applyRemoteChecklist(
    remote: CloudChecklistDto,
    parsedAnswers: Readonly<Record<string, ItemResponseValue>>,
  ): void {
    const savedTimestamp = remote.updatedAt || remote.clientUpdatedAtUtc;
    this.checklistState.restoreFromEncryptedAutosave({
      schemaVersion: remote.schemaVersion,
      answers: parsedAnswers,
      savedAt: savedTimestamp,
    });
    this.remoteVersionSignal.set(remote.version);
    this.syncErrorSignal.set(false);
  }

  private parseAnswersJson(rawJson: string): Readonly<Record<string, ItemResponseValue>> {
    try {
      const parsed: unknown = JSON.parse(rawJson);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, ItemResponseValue>;
      }
    } catch {
      // Ignore malformed JSON payloads and fallback to empty object.
    }
    return {};
  }

  private async promptSyncConflictChoice(): Promise<boolean> {
    try {
      return await firstValueFrom(
        this.feedbackHost
          .confirm({
            title: this.i18n.translateUi('cloudSyncConflictTitle'),
            message: this.i18n.translateUi('cloudSyncConflictMessage'),
            icon: 'fa-solid fa-cloud-arrow-up',
            confirmLabel: this.i18n.translateUi('cloudSyncConflictUseOnline'),
            cancelLabel: this.i18n.translateUi('cloudSyncConflictUseLocal'),
          })
          .pipe(take(1)),
      );
    } catch {
      return true;
    }
  }

  private readInitialEnabled(): boolean {
    const stored = this.storageRepository.get<boolean | string>(
      CHECKLIST_ONLINE_AUTOSAVE_ENABLED_KEY,
      'local',
    );
    return stored !== false && stored !== 'false';
  }
}
