import { TestBed } from '@angular/core/testing';
import { CryptoService } from './crypto.service';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;
  let cryptoService: CryptoService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(StorageService);
    cryptoService = TestBed.inject(CryptoService);
  });

  afterEach(() => {
    cryptoService.resetSessionKey();
    localStorage.clear();
    sessionStorage.clear();
    jest.restoreAllMocks();
  });

  // Cenário: Escrita e leitura JSON/texto plano no localStorage e sessionStorage.
  // Objetivo: Garantir persistência estruturada, listagem de chaves, cálculo de tamanho e remoção.
  it('should read, write, list keys, measure size, and remove items for local and session storage', () => {
    expect(service.setLocal('kcm_obj', { a: 1 })).toBe(true);
    expect(service.setSession('kcm_sess', { b: 2 })).toBe(true);
    localStorage.setItem('kcm_plain', 'dark');

    expect(service.getLocal<{ a: number }>('kcm_obj')).toEqual({ a: 1 });
    expect(service.getLocal<string>('kcm_plain')).toBe('dark');
    expect(service.getSession<{ b: number }>('kcm_sess')).toEqual({ b: 2 });

    expect(service.getLocalStorageKeys()).toContain('kcm_obj');
    expect(service.getSessionStorageKeys()).toContain('kcm_sess');
    expect(service.getLocalStorageSize()).toBeGreaterThan(0);
    expect(service.getSessionStorageSize()).toBeGreaterThan(0);

    service.removeLocal('kcm_obj');
    expect(service.getLocal('kcm_obj')).toBeNull();

    service.clearLocal();
    expect(service.getLocalStorageKeys()).toEqual([]);

    service.removeSession('kcm_sess');
    expect(service.getSession('kcm_sess')).toBeNull();
    service.setSession('kcm_sess2', 'ok');
    service.clearSession();
    expect(service.getSessionStorageKeys()).toEqual([]);
  });

  // Cenário: Armazenamento com tempo de expiração (TTL) e limpeza de expirados.
  // Objetivo: Garantir que entradas expiradas retornem null e sejam removidas pelo cleanup.
  it('should respect TTL expiration envelopes and purge expired entries', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);

    service.setLocal('kcm_valid', 'fresh', { expiresInMs: 5_000 });
    service.setLocal('kcm_expired', 'stale', { expiresInMs: 500 });
    service.setSession('kcm_sess_expired', 'old', { expiresInMs: 500 });

    nowSpy.mockReturnValue(1_001_000);

    expect(service.getLocal<string>('kcm_valid')).toBe('fresh');
    expect(service.cleanupExpiredLocal()).toBe(1);
    expect(service.getLocal<string>('kcm_expired')).toBeNull();

    expect(service.cleanupExpiredSession()).toBe(1);
    expect(service.getSession<string>('kcm_sess_expired')).toBeNull();
  });

  // Cenário: Uso dos helpers tipados em convenience.local e convenience.session.
  // Objetivo: Garantir leitura e escrita consistente para strings, números, booleanos, arrays e objetos.
  it('should support typed convenience accessors for both local and session storage', () => {
    service.convenience.local.setString('str', 'pt-BR');
    service.convenience.local.setNumber('num', 42);
    service.convenience.local.setBoolean('bool', true);
    service.convenience.local.setArray('arr', ['a', 'b']);
    service.convenience.local.setObject('obj', { dark: true });

    expect(service.convenience.local.getString('str')).toBe('pt-BR');
    expect(service.convenience.local.getNumber('num')).toBe(42);
    expect(service.convenience.local.getBoolean('bool')).toBe(true);
    expect(service.convenience.local.getArray<string>('arr')).toEqual(['a', 'b']);
    expect(service.convenience.local.getObject<{ dark: boolean }>('obj')).toEqual({ dark: true });

    service.convenience.session.setString('s_str', 'en-US');
    service.convenience.session.setNumber('s_num', 7);
    service.convenience.session.setBoolean('s_bool', false);
    service.convenience.session.setArray('s_arr', [1, 2]);
    service.convenience.session.setObject('s_obj', { step: 3 });

    expect(service.convenience.session.getString('s_str')).toBe('en-US');
    expect(service.convenience.session.getNumber('s_num')).toBe(7);
    expect(service.convenience.session.getBoolean('s_bool')).toBe(false);
    expect(service.convenience.session.getArray<number>('s_arr')).toEqual([1, 2]);
    expect(service.convenience.session.getObject<{ step: number }>('s_obj')).toEqual({ step: 3 });
  });

  // Cenário: Navegador sem acesso ao localStorage/sessionStorage (modo privado restrito ou SSR).
  // Objetivo: Retornar valores padrão seguros sem propagar exceções.
  it('should degrade gracefully without throwing when browser storage access fails', () => {
    const localDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError');
      },
    });

    try {
      expect(service.setLocal('k', 'v')).toBe(false);
      expect(service.getLocal('k')).toBeNull();
      expect(service.getLocalStorageKeys()).toEqual([]);
      expect(service.getLocalStorageSize()).toBe(0);
      expect(service.cleanupExpiredLocal()).toBe(0);
      expect(() => service.removeLocal('k')).not.toThrow();
      expect(() => service.clearLocal()).not.toThrow();
    } finally {
      if (localDescriptor) {
        Object.defineProperty(globalThis, 'localStorage', localDescriptor);
      }
    }
  });

  // Cenário: Escrita e leitura JSON criptografada via AES-GCM com chave de sessão.
  // Objetivo: Garantir que dados sensíveis não fiquem em texto claro no storage e respeitem TTL e rotação de chave.
  it('should encrypt and decrypt JSON payloads in localStorage/sessionStorage and reject decryption after session key reset', async () => {
    const secretPayload = {
      safeword: 'Vermelho secreto',
      answers: { item_rope: { primaryScale: 'favorite', otherText: 'nota íntima privada' } },
    };

    expect(await service.setLocalEncrypted('kcm_enc_local', secretPayload)).toBe(true);
    expect(await service.setSessionEncrypted('kcm_enc_sess', { pin: 9876 })).toBe(true);

    const rawLocal = localStorage.getItem('kcm_enc_local');
    expect(rawLocal).not.toBeNull();
    expect(rawLocal).toContain('"__kcmEncryptedEnvelope":true');
    expect(rawLocal).not.toContain('Vermelho secreto');
    expect(rawLocal).not.toContain('nota íntima privada');

    expect(await service.getLocalEncrypted<typeof secretPayload>('kcm_enc_local')).toEqual(
      secretPayload,
    );
    expect(await service.getSessionEncrypted<{ pin: number }>('kcm_enc_sess')).toEqual({
      pin: 9876,
    });

    // TTL expiration on encrypted entry
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(2_000_000);
    expect(
      await service.setLocalEncrypted('kcm_enc_ttl', { temp: true }, { expiresInMs: 100 }),
    ).toBe(true);
    nowSpy.mockReturnValue(2_001_000);
    expect(await service.getLocalEncrypted('kcm_enc_ttl')).toBeNull();
    nowSpy.mockRestore();

    // Tampered envelope returns null
    localStorage.setItem(
      'kcm_enc_tampered',
      JSON.stringify({ __kcmEncryptedEnvelope: true, v: 1, alg: 'AES-GCM', payload: 'invalid!' }),
    );
    expect(await service.getLocalEncrypted('kcm_enc_tampered')).toBeNull();

    // Rotating session key prevents decrypting data from the closed session
    cryptoService.resetSessionKey();
    expect(await service.getLocalEncrypted('kcm_enc_local')).toBeNull();
  });
});
