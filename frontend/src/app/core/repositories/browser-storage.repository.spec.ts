import { TestBed } from '@angular/core/testing';
import { StorageService } from '../services/storage.service';
import {
  BROWSER_STORAGE_REPOSITORY_TOKEN,
  BrowserStorageRepository,
} from './browser-storage.repository';

describe('BrowserStorageRepository', () => {
  let repository: BrowserStorageRepository;
  let storageService: StorageService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    repository = TestBed.inject(BrowserStorageRepository);
    storageService = TestBed.inject(StorageService);
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.restoreAllMocks();
  });

  // Cenário: Resolução via InjectionToken padrão.
  // Objetivo: Garantir que BROWSER_STORAGE_REPOSITORY_TOKEN entregue instância funcional do repositório.
  it('should resolve via BROWSER_STORAGE_REPOSITORY_TOKEN and route default local operations to StorageService', () => {
    const injected = TestBed.inject(BROWSER_STORAGE_REPOSITORY_TOKEN);
    const setLocalSpy = jest.spyOn(storageService, 'setLocal');
    const getLocalSpy = jest.spyOn(storageService, 'getLocal');

    expect(injected.set('kcm_pref', { ok: true })).toBe(true);
    expect(injected.get<{ ok: boolean }>('kcm_pref')).toEqual({ ok: true });
    expect(injected.keys()).toContain('kcm_pref');
    expect(injected.size()).toBeGreaterThan(0);

    injected.remove('kcm_pref');
    expect(injected.get('kcm_pref')).toBeNull();

    injected.set('kcm_exp', 'old', { expiresInMs: 0 });
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 10);
    expect(injected.cleanupExpired()).toBe(1);

    injected.set('kcm_clr', '1');
    injected.clear();
    expect(injected.keys()).toEqual([]);

    expect(setLocalSpy).toHaveBeenCalled();
    expect(getLocalSpy).toHaveBeenCalled();
  });

  // Cenário: Operações explicitamente direcionadas para o escopo sessionStorage.
  // Objetivo: Garantir delegação completa de get/set/remove/clear/keys/size/cleanup para sessionStorage.
  it('should delegate session-scoped operations to sessionStorage methods on StorageService', () => {
    const setSessionSpy = jest.spyOn(storageService, 'setSession');
    const getSessionSpy = jest.spyOn(storageService, 'getSession');

    expect(repository.set('sess_key', 'val', undefined, 'session')).toBe(true);
    expect(repository.get<string>('sess_key', 'session')).toBe('val');
    expect(repository.keys('session')).toContain('sess_key');
    expect(repository.size('session')).toBeGreaterThan(0);

    repository.remove('sess_key', 'session');
    expect(repository.get('sess_key', 'session')).toBeNull();

    repository.set('sess_exp', 'stale', { expiresInMs: 0 }, 'session');
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 10);
    expect(repository.cleanupExpired('session')).toBe(1);

    repository.set('sess_tmp', '1', undefined, 'session');
    repository.clear('session');
    expect(repository.keys('session')).toEqual([]);

    expect(setSessionSpy).toHaveBeenCalled();
    expect(getSessionSpy).toHaveBeenCalled();
  });

  // Cenário: Operações criptografadas getEncrypted e setEncrypted nos escopos local e session.
  // Objetivo: Garantir delegação ao StorageService e armazenamento opaco em AES-GCM sem texto claro.
  it('should delegate getEncrypted and setEncrypted across local and session scopes without storing plaintext', async () => {
    const setLocalEncSpy = jest.spyOn(storageService, 'setLocalEncrypted');
    const getLocalEncSpy = jest.spyOn(storageService, 'getLocalEncrypted');
    const setSessionEncSpy = jest.spyOn(storageService, 'setSessionEncrypted');
    const getSessionEncSpy = jest.spyOn(storageService, 'getSessionEncrypted');

    expect(
      await repository.setEncrypted('kcm_repo_enc', { secret: 'dados-privados' }, undefined, 'local'),
    ).toBe(true);
    expect(localStorage.getItem('kcm_repo_enc')).not.toContain('dados-privados');
    expect(await repository.getEncrypted<{ secret: string }>('kcm_repo_enc', 'local')).toEqual({
      secret: 'dados-privados',
    });

    expect(
      await repository.setEncrypted('kcm_sess_enc', { step: 2 }, undefined, 'session'),
    ).toBe(true);
    expect(sessionStorage.getItem('kcm_sess_enc')).not.toContain('"step":2');
    expect(await repository.getEncrypted<{ step: number }>('kcm_sess_enc', 'session')).toEqual({
      step: 2,
    });

    expect(setLocalEncSpy).toHaveBeenCalled();
    expect(getLocalEncSpy).toHaveBeenCalled();
    expect(setSessionEncSpy).toHaveBeenCalled();
    expect(getSessionEncSpy).toHaveBeenCalled();
  });
});
