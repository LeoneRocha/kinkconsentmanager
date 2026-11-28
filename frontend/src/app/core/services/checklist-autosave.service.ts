import {
  computed,
  DestroyRef,
  effect,
  inject,
  Injectable,
  InjectionToken,
  signal,
  untracked,
} from '@angular/core';
import { AutosavePersistenceMode } from '../models';
import { AuthService } from './auth.service';
import {
  CHECKLIST_ONLINE_AUTOSAVE_ENABLED_KEY,
  ChecklistCloudAutosaveService,
} from './checklist-cloud-autosave.service';
import {
  CHECKLIST_AUTOSAVE_ENABLED_KEY,
  CHECKLIST_ENCRYPTED_AUTOSAVE_KEY,
  ChecklistEncryptedAutosavePayload,
  ChecklistLocalAutosaveService,
} from './checklist-local-autosave.service';
import { ChecklistStateService } from './checklist-state.service';
import { I18nService } from './i18n.service';

export {
  CHECKLIST_AUTOSAVE_ENABLED_KEY,
  CHECKLIST_ENCRYPTED_AUTOSAVE_KEY,
  CHECKLIST_ONLINE_AUTOSAVE_ENABLED_KEY,
};
export type { ChecklistEncryptedAutosavePayload };

export const DEFAULT_AUTOSAVE_INTERVAL_MS = 60_000;
export const DEFAULT_ONLINE_DEBOUNCE_MS = 2_500;

export const CHECKLIST_AUTOSAVE_INTERVAL_MS = new InjectionToken<number>(
  'CHECKLIST_AUTOSAVE_INTERVAL_MS',
  {
    providedIn: 'root',
    factory: () => DEFAULT_AUTOSAVE_INTERVAL_MS,
  },
);

export const CHECKLIST_ONLINE_DEBOUNCE_MS = new InjectionToken<number>(
  'CHECKLIST_ONLINE_DEBOUNCE_MS',
  {
    providedIn: 'root',
    factory: () => DEFAULT_ONLINE_DEBOUNCE_MS,
  },
);

/**
 * Orquestrador único do salvamento automático do checklist.
 * Coordena timers (`setInterval`, `pagehide` e debounce reativo de 2,5s no modo on-line),
 * controle de alterações pendentes (`hasUnsavedChanges`) e roteamento transparente entre
 * `ChecklistLocalAutosaveService` (visitante offline) e `ChecklistCloudAutosaveService` (usuário autenticado).
 */
@Injectable({ providedIn: 'root' })
export class ChecklistAutosaveService {
  private readonly checklistState = inject(ChecklistStateService);
  private readonly i18n = inject(I18nService);
  private readonly auth = inject(AuthService);
  private readonly localAutosave = inject(ChecklistLocalAutosaveService);
  private readonly cloudAutosave = inject(ChecklistCloudAutosaveService);
  private readonly intervalMs = inject(CHECKLIST_AUTOSAVE_INTERVAL_MS);
  private readonly onlineDebounceMs = inject(CHECKLIST_ONLINE_DEBOUNCE_MS);

  private readonly lastAutosavedAtSignal = signal<string | null>(null);
  private readonly isSavingSignal = signal<boolean>(false);
  private readonly isRunningSignal = signal<boolean>(false);
  private readonly lastSavedFingerprintSignal = signal<string>(this.computeStateFingerprint());

  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private debounceHandle: ReturnType<typeof setTimeout> | null = null;
  private pageHideListener: (() => void) | null = null;

  readonly persistenceMode = computed<AutosavePersistenceMode>(() =>
    this.auth.isAuthenticated() ? 'online' : 'local',
  );
  readonly isOnlineMode = computed<boolean>(() => this.persistenceMode() === 'online');
  readonly isEnabled = computed<boolean>(() =>
    this.isOnlineMode() ? this.cloudAutosave.isEnabled() : this.localAutosave.isEnabled(),
  );
  readonly lastAutosavedAt = this.lastAutosavedAtSignal.asReadonly();
  readonly isSaving = this.isSavingSignal.asReadonly();
  readonly isEncrypted = this.localAutosave.isEncrypted;
  readonly isRunning = this.isRunningSignal.asReadonly();
  readonly remoteVersion = this.cloudAutosave.remoteVersion;
  readonly syncError = this.cloudAutosave.syncError;
  readonly isRestoringRemote = this.cloudAutosave.isRestoring;
  readonly hasUnsavedChanges = computed<boolean>(
    () => this.computeStateFingerprint() !== this.lastSavedFingerprintSignal(),
  );

  constructor() {
    effect(() => {
      const running = this.isRunningSignal();
      const online = this.isOnlineMode();
      const enabled = this.isEnabled();
      const restoring = this.isRestoringRemote();
      const currentFingerprint = this.computeStateFingerprint();
      const savedFingerprint = this.lastSavedFingerprintSignal();

      untracked(() => {
        this.clearDebounceTimer();
        if (running && online && enabled && !restoring && currentFingerprint !== savedFingerprint) {
          this.debounceHandle = setTimeout(() => {
            this.debounceHandle = null;
            void this.saveIfDirty();
          }, this.onlineDebounceMs);
        }
      });
    });
  }

  /**
   * Inicializa o modo ativo (local ou on-line), restaura progresso salvo, inicia timers quando habilitado
   * e registra limpeza automática na destruição do componente hospedeiro.
   */
  start(destroyRef?: DestroyRef): void {
    if (!this.isOnlineMode()) {
      this.localAutosave.initializeSessionKey();
    }
    void this.restoreFromAutosave();

    if (this.isEnabled()) {
      this.startTimers();
    }

    destroyRef?.onDestroy(() => {
      this.stop();
    });
  }

  /**
   * Habilita ou desabilita o salvamento automático para o modo ativo (`local` ou `online`).
   */
  setEnabled(enabled: boolean): void {
    if (this.isOnlineMode()) {
      this.cloudAutosave.setEnabled(enabled);
    } else {
      this.localAutosave.setEnabled(enabled);
    }

    if (enabled) {
      this.startTimers();
    } else {
      this.stop();
    }
  }

  /**
   * Para todos os timers ativos (periódico, debounce) e remove listeners de ciclo de vida.
   */
  stop(): void {
    this.clearDebounceTimer();
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
   * Constrói o snapshot completo das respostas atuais (delegando para o serviço local).
   */
  buildPayload(): ChecklistEncryptedAutosavePayload {
    return this.localAutosave.buildPayload();
  }

  /**
   * Persiste alterações pendentes apenas quando o switch automático está ativo e houve mudanças.
   */
  async saveIfDirty(): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    const currentFingerprint = this.computeStateFingerprint();
    if (currentFingerprint === this.lastSavedFingerprintSignal()) {
      return false;
    }

    if (Object.keys(this.checklistState.answers()).length === 0) {
      if (this.isOnlineMode()) {
        if (this.cloudAutosave.remoteVersion() !== null) {
          await this.cloudAutosave.deleteRemote();
        }
      } else {
        this.localAutosave.clear();
      }

      this.lastAutosavedAtSignal.set(null);
      this.lastSavedFingerprintSignal.set(currentFingerprint);
      return false;
    }

    return this.saveNow();
  }

  /**
   * Executa o salvamento imediato no destino correspondente ao modo de sessão ativo.
   */
  async saveNow(options?: { readonly forceOverwrite?: boolean }): Promise<boolean> {
    if (this.isSavingSignal()) {
      return false;
    }

    this.clearDebounceTimer();
    this.isSavingSignal.set(true);
    try {
      const fingerprint = this.computeStateFingerprint();

      if (this.isOnlineMode()) {
        const result = await this.cloudAutosave.save(options);
        if (result.saved) {
          this.lastAutosavedAtSignal.set(result.savedAt);
          this.lastSavedFingerprintSignal.set(fingerprint);
          return true;
        }
        if (result.reloadedFromCloud) {
          this.lastAutosavedAtSignal.set(result.savedAt);
          this.lastSavedFingerprintSignal.set(this.computeStateFingerprint());
        }
        return false;
      }

      const localResult = await this.localAutosave.save();
      if (localResult.saved) {
        this.lastAutosavedAtSignal.set(localResult.savedAt);
        this.lastSavedFingerprintSignal.set(fingerprint);
      }
      return localResult.saved;
    } finally {
      this.isSavingSignal.set(false);
    }
  }

  /**
   * Restaura o preenchimento salvo a partir da nuvem (autenticado) ou do `localStorage` cifrado (visitante).
   */
  async restoreFromAutosave(): Promise<boolean> {
    if (this.isOnlineMode()) {
      const result = await this.cloudAutosave.restore();
      if (result.restored) {
        this.lastAutosavedAtSignal.set(result.savedAt);
        this.lastSavedFingerprintSignal.set(this.computeStateFingerprint());
      }
      return result.restored;
    }

    const localResult = await this.localAutosave.restore();
    if (localResult.restored) {
      this.lastAutosavedAtSignal.set(localResult.savedAt);
      this.lastSavedFingerprintSignal.set(this.computeStateFingerprint());
    }
    return localResult.restored;
  }

  /**
   * Dispara a sincronização/reconciliação com a nuvem imediatamente após o login.
   */
  async syncOnSessionStarted(): Promise<boolean> {
    const result = await this.cloudAutosave.restore({ force: true });
    if (result.restored) {
      this.lastAutosavedAtSignal.set(result.savedAt);
      this.lastSavedFingerprintSignal.set(this.computeStateFingerprint());
    }
    return result.restored;
  }

  /**
   * Limpa respostas em memória e estado de sincronização ao encerrar a sessão autenticada.
   */
  handleLogoutCleanup(): void {
    this.stop();
    this.checklistState.resetAllAnswers();
    this.cloudAutosave.resetSessionState();
    this.localAutosave.resetRestoreAttempt();
    this.lastAutosavedAtSignal.set(null);
    this.lastSavedFingerprintSignal.set(this.computeStateFingerprint());
  }

  /**
   * Remove os dados salvos localmente e, se autenticado, também exclui o registro remoto no banco.
   */
  async clearAutosave(): Promise<void> {
    this.clearDebounceTimer();
    this.localAutosave.clear();
    this.lastAutosavedAtSignal.set(null);

    if (this.isOnlineMode()) {
      await this.cloudAutosave.deleteRemote();
    } else {
      this.cloudAutosave.resetSessionState();
    }

    this.lastSavedFingerprintSignal.set(this.computeStateFingerprint());
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

  private clearDebounceTimer(): void {
    if (this.debounceHandle !== null) {
      clearTimeout(this.debounceHandle);
      this.debounceHandle = null;
    }
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
