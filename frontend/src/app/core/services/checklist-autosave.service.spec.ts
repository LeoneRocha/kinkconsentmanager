import { Component, DestroyRef, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { BROWSER_STORAGE_REPOSITORY_TOKEN } from '../repositories';
import { ChecklistStateService } from './checklist-state.service';
import {
  CHECKLIST_AUTOSAVE_ENABLED_KEY,
  CHECKLIST_ENCRYPTED_AUTOSAVE_KEY,
  ChecklistAutosaveService,
  DEFAULT_AUTOSAVE_INTERVAL_MS,
} from './checklist-autosave.service';
import { CryptoService, SESSION_CRYPTO_KEY_STORAGE } from './crypto.service';

@Component({
  selector: 'app-autosave-host-stub',
  template: '',
})
class AutosaveHostStubComponent {
  readonly autosave = inject(ChecklistAutosaveService);
  readonly destroyRef = inject(DestroyRef);
}

describe('ChecklistAutosaveService', () => {
  let service: ChecklistAutosaveService;
  let checklistState: ChecklistStateService;
  let cryptoService: CryptoService;

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      imports: [AutosaveHostStubComponent],
      providers: [provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' })],
    });

    service = TestBed.inject(ChecklistAutosaveService);
    checklistState = TestBed.inject(ChecklistStateService);
    cryptoService = TestBed.inject(CryptoService);
  });

  afterEach(() => {
    service.stop();
    cryptoService.resetSessionKey();
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // Cenário: Autosave periódico a cada 1 minuto (60.000 ms) com chave de sessão persistida e payload cifrado.
  // Objetivo: Garantir salvamento em JSON criptografado apenas quando há alterações e pular ticks ociosos.
  it('should save encrypted full JSON every 1 minute when dirty and skip idle ticks', async () => {
    const repo = TestBed.inject(BROWSER_STORAGE_REPOSITORY_TOKEN);
    const setEncryptedSpy = jest.spyOn(repo, 'setEncrypted');

    service.start();
    await cryptoService.getOrInitializeSessionKey();

    expect(service.isRunning()).toBe(true);
    expect(service.isEncrypted()).toBe(true);
    expect(sessionStorage.getItem(SESSION_CRYPTO_KEY_STORAGE)).toBeTruthy();

    // Primeiro tick sem respostas -> não grava
    await jest.advanceTimersByTimeAsync(DEFAULT_AUTOSAVE_INTERVAL_MS);
    expect(setEncryptedSpy).not.toHaveBeenCalled();

    // Registra preenchimento com observação sensível
    checklistState.setItemAnswer('item_safeword', {
      selectedOption: 'opt_other',
      otherText: 'palavra-secreta-pessoal',
    });
    checklistState.setViewMode('classic');
    expect(service.hasUnsavedChanges()).toBe(true);

    // Avança 1 minuto -> dispara salvamento criptografado e aguarda conclusão da Web Crypto API
    await jest.advanceTimersByTimeAsync(DEFAULT_AUTOSAVE_INTERVAL_MS);
    const pendingSave = setEncryptedSpy.mock.results[0]?.value as Promise<boolean> | undefined;
    expect(pendingSave).toBeDefined();
    await pendingSave;
    await Promise.resolve();
    await Promise.resolve();

    expect(setEncryptedSpy).toHaveBeenCalledTimes(1);
    expect(service.hasUnsavedChanges()).toBe(false);
    expect(service.lastAutosavedAt()).not.toBeNull();

    const rawEncrypted = localStorage.getItem(CHECKLIST_ENCRYPTED_AUTOSAVE_KEY);
    expect(rawEncrypted).toBeTruthy();
    expect(rawEncrypted).toContain('"__kcmEncryptedEnvelope":true');
    expect(rawEncrypted).not.toContain('item_safeword');
    expect(rawEncrypted).not.toContain('palavra-secreta-pessoal');

    // Novo tick de 1 minuto sem mudanças adicionais -> não reescreve no storage
    await jest.advanceTimersByTimeAsync(DEFAULT_AUTOSAVE_INTERVAL_MS);
    expect(setEncryptedSpy).toHaveBeenCalledTimes(1);
  });

  // Cenário: Restauração do preenchimento criptografado dentro da mesma sessão do navegador.
  // Objetivo: Descriptografar e hidratar respostas, idioma/viewMode e timestamp na ChecklistStateService.
  it('should decrypt and restore full filling JSON within the same browser session', async () => {
    checklistState.setItemAnswer('item_rope', { primaryScale: 'enjoy', secondaryScale: 'curious' });
    checklistState.setViewMode('full');
    checklistState.setActiveCategory(2);

    expect(await service.saveNow()).toBe(true);

    // Nova instância na mesma sessão (sessionStorage preserva a chave de sessão)
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' })],
    });

    const restoredChecklistState = TestBed.inject(ChecklistStateService);
    const restoredAutosave = TestBed.inject(ChecklistAutosaveService);
    const restoredCrypto = TestBed.inject(CryptoService);

    expect(restoredChecklistState.answers()).toEqual({});

    const ok = await restoredAutosave.restoreFromAutosave();
    expect(ok).toBe(true);
    expect(restoredChecklistState.answers()).toEqual({
      item_rope: { primaryScale: 'enjoy', secondaryScale: 'curious' },
    });
    expect(restoredChecklistState.viewMode()).toBe('full');
    expect(restoredChecklistState.activeCategoryIndex()).toBe(2);
    expect(restoredAutosave.lastAutosavedAt()).not.toBeNull();

    restoredAutosave.stop();
    restoredCrypto.resetSessionKey();
  });

  // Cenário: Nova sessão sem a chave anterior (simulada com resetSessionKey).
  // Objetivo: Falhar de forma segura na descriptografia, remover o blob ilegível e não lançar exceção.
  it('should return false and remove unreadable autosave blob when session key is rotated', async () => {
    checklistState.setItemAnswer('item_rope', { primaryScale: 'favorite' });
    expect(await service.saveNow()).toBe(true);
    expect(localStorage.getItem(CHECKLIST_ENCRYPTED_AUTOSAVE_KEY)).not.toBeNull();

    // Simula fechamento/abertura de sessão gerando nova chave de sessão
    cryptoService.resetSessionKey();
    checklistState.resetAllAnswers();

    const restored = await service.restoreFromAutosave();
    expect(restored).toBe(false);
    expect(checklistState.answers()).toEqual({});
    expect(localStorage.getItem(CHECKLIST_ENCRYPTED_AUTOSAVE_KEY)).toBeNull();
  });

  // Cenário: Limpeza explícita do autosave e destruição automática via DestroyRef.
  // Objetivo: Garantir que clearAutosave apague o registro criptografado e que DestroyRef pare o intervalo.
  it('should clear encrypted autosave on clearAutosave() and stop timer automatically on DestroyRef destroy', async () => {
    const fixture = TestBed.createComponent(AutosaveHostStubComponent);
    const { autosave, destroyRef } = fixture.componentInstance;

    autosave.start(destroyRef);
    await Promise.resolve();
    expect(autosave.isRunning()).toBe(true);

    checklistState.setItemAnswer('item_rope', { primaryScale: 'enjoy' });
    expect(await autosave.saveNow()).toBe(true);
    expect(autosave.lastAutosavedAt()).not.toBeNull();

    autosave.clearAutosave();
    expect(autosave.lastAutosavedAt()).toBeNull();
    expect(localStorage.getItem(CHECKLIST_ENCRYPTED_AUTOSAVE_KEY)).toBeNull();

    fixture.destroy();
    expect(autosave.isRunning()).toBe(false);
  });

  it('should persist disabled state, stop periodic autosaving, skip saveIfDirty, and resume when re-enabled', async () => {
    const repo = TestBed.inject(BROWSER_STORAGE_REPOSITORY_TOKEN);
    const setEncryptedSpy = jest.spyOn(repo, 'setEncrypted');

    service.start();
    await cryptoService.getOrInitializeSessionKey();
    expect(service.isEnabled()).toBe(true);
    expect(service.isRunning()).toBe(true);

    service.setEnabled(false);
    expect(service.isEnabled()).toBe(false);
    expect(service.isRunning()).toBe(false);
    expect(repo.get<boolean>(CHECKLIST_AUTOSAVE_ENABLED_KEY, 'local')).toBe(false);

    checklistState.setItemAnswer('item_safeword', { selectedOption: 'opt_traffic' });
    expect(await service.saveIfDirty()).toBe(false);
    await jest.advanceTimersByTimeAsync(DEFAULT_AUTOSAVE_INTERVAL_MS);
    expect(setEncryptedSpy).not.toHaveBeenCalled();

    // Manual save still works when auto-save is disabled
    expect(await service.saveNow()).toBe(true);
    expect(setEncryptedSpy).toHaveBeenCalledTimes(1);

    // Re-enable -> persists true and resumes periodic timer
    service.setEnabled(true);
    expect(service.isEnabled()).toBe(true);
    expect(service.isRunning()).toBe(true);
    expect(repo.get<boolean>(CHECKLIST_AUTOSAVE_ENABLED_KEY, 'local')).toBe(true);

    checklistState.setItemAnswer('item_rope', { primaryScale: 'enjoy' });
    await jest.advanceTimersByTimeAsync(DEFAULT_AUTOSAVE_INTERVAL_MS);
    const pendingSave = setEncryptedSpy.mock.results[1]?.value as Promise<boolean> | undefined;
    expect(pendingSave).toBeDefined();
    await pendingSave;
    expect(setEncryptedSpy).toHaveBeenCalledTimes(2);
  });
});
