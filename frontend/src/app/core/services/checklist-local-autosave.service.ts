import { inject, Injectable, signal } from '@angular/core';
import { ChecklistViewMode, ItemResponseValue, SupportedLanguage } from '../models';
import { BROWSER_STORAGE_REPOSITORY_TOKEN } from '../repositories';
import { ChecklistStateService } from './checklist-state.service';
import { CryptoService } from './crypto.service';
import { I18nService } from './i18n.service';

export const CHECKLIST_ENCRYPTED_AUTOSAVE_KEY = 'kcm_checklist_autosave_enc_v1';
export const CHECKLIST_AUTOSAVE_ENABLED_KEY = 'kcm_checklist_autosave_enabled_v1';

export interface ChecklistEncryptedAutosavePayload {
  readonly schemaVersion: string;
  readonly savedAt: string;
  readonly language: SupportedLanguage;
  readonly viewMode: ChecklistViewMode;
  readonly activeCategoryIndex: number;
  readonly answers: Readonly<Record<string, ItemResponseValue>>;
}

export interface ChecklistLocalAutosaveResult {
  readonly saved: boolean;
  readonly savedAt: string | null;
}

export interface ChecklistLocalRestoreResult {
  readonly restored: boolean;
  readonly savedAt: string | null;
}

/**
 * Serviço dedicado à persistência local criptografada (AES-GCM 256-bit no `localStorage`)
 * para visitantes anônimos e migração de rascunho no início de sessão autenticada.
 */
@Injectable({ providedIn: 'root' })
export class ChecklistLocalAutosaveService {
  private readonly checklistState = inject(ChecklistStateService);
  private readonly i18n = inject(I18nService);
  private readonly storageRepository = inject(BROWSER_STORAGE_REPOSITORY_TOKEN);
  private readonly crypto = inject(CryptoService);

  private readonly enabledSignal = signal<boolean>(this.readInitialEnabled());
  private readonly encryptedSignal = signal<boolean>(this.crypto.isSupported());
  private hasAttemptedRestore = false;

  readonly isEnabled = this.enabledSignal.asReadonly();
  readonly isEncrypted = this.encryptedSignal.asReadonly();

  /**
   * Inicializa a chave criptográfica de sessão no `sessionStorage` em segundo plano.
   */
  initializeSessionKey(): void {
    void this.crypto.getOrInitializeSessionKey().catch(() => undefined);
  }

  /**
   * Habilita ou desabilita o salvamento automático local e persiste a preferência.
   */
  setEnabled(enabled: boolean): void {
    this.enabledSignal.set(enabled);
    this.storageRepository.set(CHECKLIST_AUTOSAVE_ENABLED_KEY, enabled, undefined, 'local');
  }

  /**
   * Constrói o snapshot completo do preenchimento atual para criptografia local.
   */
  buildPayload(): ChecklistEncryptedAutosavePayload {
    const draft = this.checklistState.exportDraftSnapshot(this.i18n.currentLang());
    return {
      schemaVersion: draft.schemaVersion,
      savedAt: new Date().toISOString(),
      language: draft.language,
      viewMode: this.checklistState.viewMode(),
      activeCategoryIndex: this.checklistState.activeCategoryIndex(),
      answers: draft.answers,
    };
  }

  /**
   * Verifica se existe algum rascunho local armazenado no `localStorage`.
   */
  hasStoredDraft(): boolean {
    return this.storageRepository.keys('local').includes(CHECKLIST_ENCRYPTED_AUTOSAVE_KEY);
  }

  /**
   * Descriptografa e retorna o rascunho armazenado no `localStorage`, quando legível.
   */
  async readEncryptedDraft(): Promise<ChecklistEncryptedAutosavePayload | null> {
    if (!this.hasStoredDraft()) {
      return null;
    }

    return this.storageRepository.getEncrypted<ChecklistEncryptedAutosavePayload>(
      CHECKLIST_ENCRYPTED_AUTOSAVE_KEY,
      'local',
    );
  }

  /**
   * Criptografa e grava o snapshot atual no `localStorage`.
   */
  async save(): Promise<ChecklistLocalAutosaveResult> {
    const payload = this.buildPayload();
    const saved = await this.storageRepository.setEncrypted(
      CHECKLIST_ENCRYPTED_AUTOSAVE_KEY,
      payload,
      undefined,
      'local',
    );

    return {
      saved,
      savedAt: saved ? payload.savedAt : null,
    };
  }

  /**
   * Restaura o rascunho local criptografado para o `ChecklistStateService` caso não haja respostas em memória.
   * Remove automaticamente blobs ilegíveis (ex.: rotação de chave de sessão).
   */
  async restore(options?: { readonly force?: boolean }): Promise<ChecklistLocalRestoreResult> {
    if (!options?.force && this.hasAttemptedRestore) {
      return { restored: false, savedAt: null };
    }

    this.hasAttemptedRestore = true;

    if (Object.keys(this.checklistState.answers()).length > 0) {
      return { restored: false, savedAt: null };
    }

    const payload = await this.readEncryptedDraft();
    if (!payload) {
      if (this.hasStoredDraft()) {
        this.clear();
      }
      return { restored: false, savedAt: null };
    }

    this.checklistState.restoreFromEncryptedAutosave({
      schemaVersion: payload.schemaVersion,
      answers: payload.answers,
      viewMode: payload.viewMode,
      activeCategoryIndex: payload.activeCategoryIndex,
      savedAt: payload.savedAt,
    });

    return {
      restored: true,
      savedAt: payload.savedAt ?? null,
    };
  }

  /**
   * Remove o snapshot criptografado do `localStorage`.
   */
  clear(): void {
    this.storageRepository.remove(CHECKLIST_ENCRYPTED_AUTOSAVE_KEY, 'local');
  }

  /**
   * Reseta a flag de tentativa de restauração local (usado em limpeza de sessão).
   */
  resetRestoreAttempt(): void {
    this.hasAttemptedRestore = false;
  }

  private readInitialEnabled(): boolean {
    const stored = this.storageRepository.get<boolean | string>(
      CHECKLIST_AUTOSAVE_ENABLED_KEY,
      'local',
    );
    return stored !== false && stored !== 'false';
  }
}
