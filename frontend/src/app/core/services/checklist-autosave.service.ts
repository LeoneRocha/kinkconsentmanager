import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  InjectionToken,
  signal,
} from '@angular/core';
import {
  ChecklistViewMode,
  ItemResponseValue,
  SupportedLanguage,
} from '../models';
import { BROWSER_STORAGE_REPOSITORY_TOKEN } from '../repositories';
import { ChecklistStateService } from './checklist-state.service';
import { CryptoService } from './crypto.service';
import { I18nService } from './i18n.service';

export const CHECKLIST_ENCRYPTED_AUTOSAVE_KEY = 'kcm_checklist_autosave_enc_v1';
export const CHECKLIST_AUTOSAVE_ENABLED_KEY = 'kcm_checklist_autosave_enabled_v1';
export const DEFAULT_AUTOSAVE_INTERVAL_MS = 60_000;

export const CHECKLIST_AUTOSAVE_INTERVAL_MS = new InjectionToken<number>(
  'CHECKLIST_AUTOSAVE_INTERVAL_MS',
  {
    providedIn: 'root',
    factory: () => DEFAULT_AUTOSAVE_INTERVAL_MS,
  },
);

export interface ChecklistEncryptedAutosavePayload {
  readonly schemaVersion: string;
  readonly savedAt: string;
  readonly language: SupportedLanguage;
  readonly viewMode: ChecklistViewMode;
  readonly activeCategoryIndex: number;
  readonly answers: Readonly<Record<string, ItemResponseValue>>;
}

/**
 * Coordinates periodic 1-minute encrypted JSON autosave of the checklist filling
 * using a per-session Web Crypto AES-GCM key persisted in sessionStorage.
 */
@Injectable({ providedIn: 'root' })
export class ChecklistAutosaveService {
  private readonly checklistState = inject(ChecklistStateService);
  private readonly i18n = inject(I18nService);
  private readonly storageRepository = inject(BROWSER_STORAGE_REPOSITORY_TOKEN);
  private readonly crypto = inject(CryptoService);
  private readonly intervalMs = inject(CHECKLIST_AUTOSAVE_INTERVAL_MS);

  private readonly enabledSignal = signal<boolean>(this.readInitialEnabled());
  private readonly lastAutosavedAtSignal = signal<string | null>(null);
  private readonly isSavingSignal = signal<boolean>(false);
  private readonly isEncryptedSignal = signal<boolean>(this.crypto.isSupported());
  private readonly isRunningSignal = signal<boolean>(false);
  private readonly lastSavedFingerprintSignal = signal<string>(this.computeStateFingerprint());

  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private pageHideListener: (() => void) | null = null;
  private hasAttemptedRestore = false;

  readonly isEnabled = this.enabledSignal.asReadonly();
  readonly lastAutosavedAt = this.lastAutosavedAtSignal.asReadonly();
  readonly isSaving = this.isSavingSignal.asReadonly();
  readonly isEncrypted = this.isEncryptedSignal.asReadonly();
  readonly isRunning = this.isRunningSignal.asReadonly();
  readonly hasUnsavedChanges = computed<boolean>(
    () => this.computeStateFingerprint() !== this.lastSavedFingerprintSignal(),
  );

  /**
   * Initializes the session encryption key, restores any encrypted autosave snapshot from the
   * active session, starts the periodic 1-minute autosave interval if enabled, and cleans up on destroy.
   */
  start(destroyRef?: DestroyRef): void {
    void this.crypto.getOrInitializeSessionKey().catch(() => undefined);

    if (!this.hasAttemptedRestore) {
      void this.restoreFromAutosave();
    }

    if (this.enabledSignal()) {
      this.startTimers();
    }

    destroyRef?.onDestroy(() => {
      this.stop();
    });
  }

  /**
   * Enables or disables periodic automatic saving and persists the preference locally.
   */
  setEnabled(enabled: boolean): void {
    this.enabledSignal.set(enabled);
    this.storageRepository.set(CHECKLIST_AUTOSAVE_ENABLED_KEY, enabled, undefined, 'local');
    if (enabled) {
      this.startTimers();
    } else {
      this.stop();
    }
  }

  private startTimers(): void {
    if (this.intervalHandle === null) {
      this.intervalHandle = setInterval(() => {
        void this.saveIfDirty();
      }, this.intervalMs);
      this.isRunningSignal.set(true);
    }

    if (typeof window !== 'undefined' && this.pageHideListener === null) {
      this.pageHideListener = () => {
        void this.saveIfDirty();
      };
      window.addEventListener('pagehide', this.pageHideListener);
    }
  }

  private readInitialEnabled(): boolean {
    const stored = this.storageRepository.get<boolean | string>(
      CHECKLIST_AUTOSAVE_ENABLED_KEY,
      'local',
    );
    return stored !== false && stored !== 'false';
  }

  /**
   * Stops the periodic autosave timer and detaches lifecycle listeners.
   */
  stop(): void {
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    if (typeof window !== 'undefined' && this.pageHideListener !== null) {
      window.removeEventListener('pagehide', this.pageHideListener);
      this.pageHideListener = null;
    }
    this.isRunningSignal.set(false);
  }

  /**
   * Builds a complete JSON snapshot of the user's current checklist filling.
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
   * Saves encrypted JSON only when autosave is enabled and state changed since the last saved snapshot.
   */
  async saveIfDirty(): Promise<boolean> {
    if (!this.enabledSignal()) {
      return false;
    }

    const currentFingerprint = this.computeStateFingerprint();
    if (currentFingerprint === this.lastSavedFingerprintSignal()) {
      return false;
    }

    if (Object.keys(this.checklistState.answers()).length === 0) {
      if (this.storageRepository.keys('local').includes(CHECKLIST_ENCRYPTED_AUTOSAVE_KEY)) {
        this.storageRepository.remove(CHECKLIST_ENCRYPTED_AUTOSAVE_KEY, 'local');
      }
      this.lastAutosavedAtSignal.set(null);
      this.lastSavedFingerprintSignal.set(currentFingerprint);
      return false;
    }

    return this.saveNow();
  }

  /**
   * Encrypts and stores the complete checklist filling JSON immediately.
   */
  async saveNow(): Promise<boolean> {
    if (this.isSavingSignal()) {
      return false;
    }

    this.isSavingSignal.set(true);
    try {
      const fingerprint = this.computeStateFingerprint();
      const payload = this.buildPayload();
      const saved = await this.storageRepository.setEncrypted(
        CHECKLIST_ENCRYPTED_AUTOSAVE_KEY,
        payload,
        undefined,
        'local',
      );

      if (saved) {
        this.lastAutosavedAtSignal.set(payload.savedAt);
        this.lastSavedFingerprintSignal.set(fingerprint);
      }
      return saved;
    } finally {
      this.isSavingSignal.set(false);
    }
  }

  /**
   * Attempts to decrypt and restore a saved snapshot into ChecklistStateService when no in-memory answers exist.
   */
  async restoreFromAutosave(): Promise<boolean> {
    this.hasAttemptedRestore = true;

    if (Object.keys(this.checklistState.answers()).length > 0) {
      return false;
    }

    const payload =
      await this.storageRepository.getEncrypted<ChecklistEncryptedAutosavePayload>(
        CHECKLIST_ENCRYPTED_AUTOSAVE_KEY,
        'local',
      );

    if (!payload) {
      if (this.storageRepository.keys('local').includes(CHECKLIST_ENCRYPTED_AUTOSAVE_KEY)) {
        this.storageRepository.remove(CHECKLIST_ENCRYPTED_AUTOSAVE_KEY, 'local');
      }
      return false;
    }

    this.checklistState.restoreFromEncryptedAutosave({
      schemaVersion: payload.schemaVersion,
      answers: payload.answers,
      viewMode: payload.viewMode,
      activeCategoryIndex: payload.activeCategoryIndex,
      savedAt: payload.savedAt,
    });
    this.lastAutosavedAtSignal.set(payload.savedAt ?? null);
    this.lastSavedFingerprintSignal.set(this.computeStateFingerprint());
    return true;
  }

  /**
   * Removes any encrypted autosave snapshot and resets the last-saved status.
   */
  clearAutosave(): void {
    this.storageRepository.remove(CHECKLIST_ENCRYPTED_AUTOSAVE_KEY, 'local');
    this.lastAutosavedAtSignal.set(null);
    this.lastSavedFingerprintSignal.set(this.computeStateFingerprint());
  }

  private computeStateFingerprint(): string {
    return JSON.stringify({
      answers: this.checklistState.answers(),
      viewMode: this.checklistState.viewMode(),
      activeCategoryIndex: this.checklistState.activeCategoryIndex(),
      language: this.i18n.currentLang(),
    });
  }
}
