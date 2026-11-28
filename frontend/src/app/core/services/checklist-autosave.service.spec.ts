import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, DestroyRef, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { AuthUser, CloudChecklistDto } from '../models';
import { BROWSER_STORAGE_REPOSITORY_TOKEN } from '../repositories';
import { AUTH_SESSION_STORAGE_KEY, AuthService } from './auth.service';
import { API_BASE_URL } from './base-data.service';
import { ChecklistStateService } from './checklist-state.service';
import {
  CHECKLIST_AUTOSAVE_ENABLED_KEY,
  CHECKLIST_ENCRYPTED_AUTOSAVE_KEY,
  CHECKLIST_ONLINE_AUTOSAVE_ENABLED_KEY,
  ChecklistAutosaveService,
  DEFAULT_AUTOSAVE_INTERVAL_MS,
  DEFAULT_ONLINE_DEBOUNCE_MS,
} from './checklist-autosave.service';
import { CryptoService, SESSION_CRYPTO_KEY_STORAGE } from './crypto.service';
import { UiFeedbackHostService } from './ui-feedback-host.service';

@Component({
  selector: 'app-autosave-host-stub',
  template: '',
})
class AutosaveHostStubComponent {
  readonly autosave = inject(ChecklistAutosaveService);
  readonly destroyRef = inject(DestroyRef);
}

const MOCK_AUTH_USER: AuthUser = {
  id: 2,
  login: 'user.kink',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  lastLoginAt: null,
};

function seedAuthenticatedSession(): void {
  localStorage.setItem(
    AUTH_SESSION_STORAGE_KEY,
    JSON.stringify({
      user: MOCK_AUTH_USER,
      accessToken: 'jwt-online-token',
      refreshToken: 'refresh-online-token',
      expiresAtUtc: new Date(Date.now() + 3600_000).toISOString(),
    }),
  );
}

describe('ChecklistAutosaveService', () => {
  let service: ChecklistAutosaveService;
  let checklistState: ChecklistStateService;
  let cryptoService: CryptoService;
  let httpMock: HttpTestingController;
  let feedbackHost: UiFeedbackHostService;

  const configureAutosaveModule = (): void => {
    TestBed.configureTestingModule({
      imports: [AutosaveHostStubComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' }),
        { provide: API_BASE_URL, useValue: 'https://api.example.test' },
      ],
    });

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', {
      ui: {
        cloudSyncConflictTitle: 'Encontramos respostas locais e on-line',
        cloudSyncConflictMessage: 'Escolha qual versão manter.',
        cloudSyncConflictUseOnline: 'Usar versão on-line',
        cloudSyncConflictUseLocal: 'Manter versão local e enviar on-line',
      },
    });
    translate.use('pt-BR');

    service = TestBed.inject(ChecklistAutosaveService);
    checklistState = TestBed.inject(ChecklistStateService);
    cryptoService = TestBed.inject(CryptoService);
    httpMock = TestBed.inject(HttpTestingController);
    feedbackHost = TestBed.inject(UiFeedbackHostService);
  };

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
    localStorage.clear();
    sessionStorage.clear();
    configureAutosaveModule();
  });

  afterEach(() => {
    service.stop();
    cryptoService.resetSessionKey();
    httpMock.verify();
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
    configureAutosaveModule();

    const restoredChecklistState = checklistState;
    const restoredAutosave = service;
    const restoredCrypto = cryptoService;

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

  // Cenário: Usuário autenticado preenche respostas com debounce on-line (2,5s) sem gravar em localStorage.
  // Objetivo: Confirmar persistência via PUT /api/v1/checklists/current, ausência de gravação local e exclusão via DELETE.
  it('should save online with debounce when authenticated, skip localStorage, and delete on clearAutosave()', async () => {
    TestBed.resetTestingModule();
    seedAuthenticatedSession();
    configureAutosaveModule();

    expect(service.persistenceMode()).toBe('online');
    expect(service.isOnlineMode()).toBe(true);
    expect(service.isEnabled()).toBe(true);

    service.start();
    const initialGet = httpMock.expectOne('https://api.example.test/api/v1/checklists/current');
    expect(initialGet.request.method).toBe('GET');
    initialGet.flush(
      { isSuccess: false, statusCode: 404 },
      { status: 404, statusText: 'Not Found' },
    );
    await Promise.resolve();
    await Promise.resolve();

    checklistState.setItemAnswer('item_rope', { primaryScale: 'enjoy' });
    expect(service.hasUnsavedChanges()).toBe(true);

    // Avança 2,5s do debounce reativo -> dispara PUT sem tocar no localStorage
    await jest.advanceTimersByTimeAsync(DEFAULT_ONLINE_DEBOUNCE_MS);
    const putReq = httpMock.expectOne('https://api.example.test/api/v1/checklists/current');
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body.expectedVersion).toBeNull();
    expect(putReq.request.body.answersJson).toContain('item_rope');

    const cloudDto: CloudChecklistDto = {
      id: 1,
      schemaVersion: '1.0.0',
      language: 'pt-BR',
      answersJson: putReq.request.body.answersJson,
      clientUpdatedAtUtc: '2026-11-27T12:00:00.000Z',
      version: 1,
      createdAt: '2026-11-27T12:00:00.000Z',
      updatedAt: '2026-11-27T12:00:00.000Z',
    };
    putReq.flush({ isSuccess: true, statusCode: 200, data: cloudDto });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(service.remoteVersion()).toBe(1);
    expect(service.hasUnsavedChanges()).toBe(false);
    expect(service.syncError()).toBe(false);
    expect(localStorage.getItem(CHECKLIST_ENCRYPTED_AUTOSAVE_KEY)).toBeNull();

    // Limpar tudo dispara DELETE /api/v1/checklists/current
    const clearPromise = service.clearAutosave();
    const deleteReq = httpMock.expectOne('https://api.example.test/api/v1/checklists/current');
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush({ isSuccess: true, statusCode: 200, data: true });
    await clearPromise;

    expect(service.remoteVersion()).toBeNull();
    expect(service.lastAutosavedAt()).toBeNull();
  });

  // Cenário: Usuário logado desliga o switch on-line e usa o botão Salvar manualmente, além de tratar erro de rede.
  // Objetivo: Garantir que switch desligado bloqueie autosave automático mas mantenha saveNow() funcional.
  it('should respect disabled online toggle for auto-save while keeping manual saveNow() and capturing network errors', async () => {
    TestBed.resetTestingModule();
    seedAuthenticatedSession();
    configureAutosaveModule();

    service.setEnabled(false);
    expect(service.isEnabled()).toBe(false);
    expect(localStorage.getItem(CHECKLIST_ONLINE_AUTOSAVE_ENABLED_KEY)).toBe('false');

    checklistState.setItemAnswer('item_rope', { primaryScale: 'favorite' });
    expect(await service.saveIfDirty()).toBe(false);
    httpMock.expectNone('https://api.example.test/api/v1/checklists/current');

    // Falha de rede no saveNow manual mantém syncError=true e hasUnsavedChanges=true
    const failedSavePromise = service.saveNow();
    const failPut = httpMock.expectOne('https://api.example.test/api/v1/checklists/current');
    failPut.error(new ProgressEvent('error'));
    expect(await failedSavePromise).toBe(false);
    expect(service.syncError()).toBe(true);
    expect(service.hasUnsavedChanges()).toBe(true);

    // Retry manual bem-sucedido limpa syncError
    const retrySavePromise = service.saveNow();
    const okPut = httpMock.expectOne('https://api.example.test/api/v1/checklists/current');
    okPut.flush({
      isSuccess: true,
      statusCode: 200,
      data: {
        id: 1,
        schemaVersion: '1.0.0',
        language: 'pt-BR',
        answersJson: okPut.request.body.answersJson,
        clientUpdatedAtUtc: '2026-11-27T12:05:00.000Z',
        version: 1,
        createdAt: '2026-11-27T12:05:00.000Z',
        updatedAt: '2026-11-27T12:05:00.000Z',
      },
    });
    expect(await retrySavePromise).toBe(true);
    expect(service.syncError()).toBe(false);
    expect(service.hasUnsavedChanges()).toBe(false);
  });

  // Cenário: Transição Anônimo -> Logado com rascunho local e banco vazio, seguida de conflito e logout.
  // Objetivo: Migrar rascunho anônimo para a nuvem no login, resolver conflito 409/local e limpar tudo no logout.
  it('should migrate local draft when cloud is empty, resolve conflicts, and clear memory on logout', async () => {
    // 1. Preenche anônimo antes do login
    checklistState.setItemAnswer('item_rope', { primaryScale: 'curious' });
    expect(await service.saveNow()).toBe(true);
    expect(localStorage.getItem(CHECKLIST_ENCRYPTED_AUTOSAVE_KEY)).not.toBeNull();

    // 2. Autentica via AuthService.login e sincroniza -> banco retorna 404, logo migra via PUT e remove localStorage
    const authService = TestBed.inject(AuthService);
    authService.login({ loginOrEmail: 'user.kink', password: 'Strong@123' }).subscribe();
    const loginReq = httpMock.expectOne('https://api.example.test/api/v1/auth/login');
    const futureExpiry = new Date(Date.now() + 3600_000).toISOString();
    loginReq.flush({
      isSuccess: true,
      statusCode: 200,
      data: {
        accessToken: 'jwt-online-token',
        refreshToken: 'refresh-online-token',
        expiresAtUtc: futureExpiry,
        refreshTokenExpiresAtUtc: futureExpiry,
        user: MOCK_AUTH_USER,
      },
    });

    const syncPromise = service.syncOnSessionStarted();
    const getReq = httpMock.expectOne('https://api.example.test/api/v1/checklists/current');
    getReq.flush({ isSuccess: false, statusCode: 404 }, { status: 404, statusText: 'Not Found' });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    const migratePut = httpMock.expectOne('https://api.example.test/api/v1/checklists/current');
    expect(migratePut.request.method).toBe('PUT');
    expect(migratePut.request.body.answersJson).toContain('item_rope');
    migratePut.flush({
      isSuccess: true,
      statusCode: 200,
      data: {
        id: 5,
        schemaVersion: '1.0.0',
        language: 'pt-BR',
        answersJson: migratePut.request.body.answersJson,
        clientUpdatedAtUtc: '2026-11-27T12:10:00.000Z',
        version: 1,
        createdAt: '2026-11-27T12:10:00.000Z',
        updatedAt: '2026-11-27T12:10:00.000Z',
      },
    });
    expect(await syncPromise).toBe(true);
    expect(localStorage.getItem(CHECKLIST_ENCRYPTED_AUTOSAVE_KEY)).toBeNull();
    expect(service.remoteVersion()).toBe(1);

    // 3. Simula conflito 409 ao salvar e usuário escolhe manter versão local e sobrescrever
    jest.spyOn(feedbackHost, 'confirm').mockReturnValueOnce(of(false));
    checklistState.setItemAnswer('item_rope', { primaryScale: 'favorite' });
    const conflictSavePromise = service.saveNow();

    const putConflict = httpMock.expectOne('https://api.example.test/api/v1/checklists/current');
    expect(putConflict.request.body.expectedVersion).toBe(1);
    putConflict.flush(
      { isSuccess: false, statusCode: 409, messageKey: 'Checklist.VersionConflict' },
      { status: 409, statusText: 'Conflict' },
    );
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    const overwritePut = httpMock.expectOne('https://api.example.test/api/v1/checklists/current');
    expect(overwritePut.request.body.expectedVersion).toBeNull();
    overwritePut.flush({
      isSuccess: true,
      statusCode: 200,
      data: {
        id: 5,
        schemaVersion: '1.0.0',
        language: 'pt-BR',
        answersJson: overwritePut.request.body.answersJson,
        clientUpdatedAtUtc: '2026-11-27T12:12:00.000Z',
        version: 3,
        createdAt: '2026-11-27T12:10:00.000Z',
        updatedAt: '2026-11-27T12:12:00.000Z',
      },
    });
    expect(await conflictSavePromise).toBe(true);
    expect(service.remoteVersion()).toBe(3);

    // 4. Logout limpa respostas da memória e versão remota
    service.handleLogoutCleanup();
    expect(checklistState.answers()).toEqual({});
    expect(service.remoteVersion()).toBeNull();
    expect(service.lastAutosavedAt()).toBeNull();
  });
});
