import { TestBed } from '@angular/core/testing';
import { CryptoService, SESSION_CRYPTO_KEY_STORAGE } from './crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CryptoService);
  });

  afterEach(() => {
    service.resetSessionKey();
    sessionStorage.clear();
    localStorage.clear();
    jest.restoreAllMocks();
  });

  // Cenário: Verificação de suporte Web Crypto, geração, exportação e importação de chave AES-GCM.
  // Objetivo: Garantir que chaves AES-GCM 256-bit sejam geradas e serializáveis em Base64.
  it('should generate, export, and import 256-bit AES-GCM keys using Web Crypto API', async () => {
    expect(service.isSupported()).toBe(true);

    const key = await service.generateKey();
    const exported = await service.exportKey(key);
    expect(typeof exported).toBe('string');
    expect(exported.length).toBeGreaterThan(20);

    const reimported = await service.importKey(exported);
    const ciphertext = await service.encrypt('consent-secret', key);
    const decrypted = await service.decrypt(ciphertext, reimported);
    expect(decrypted).toBe('consent-secret');
  });

  // Cenário: Criptografia e descriptografia com IV aleatório e texto UTF-8/português.
  // Objetivo: Garantir que textos idênticos gerem ciphertexts distintos (IV aleatório) e preservem acentuação.
  it('should encrypt and decrypt UTF-8 JSON payloads with unique IVs per call', async () => {
    const payload = JSON.stringify({
      safeword: 'Semáforo — atenção redobrada',
      notes: 'Limites rígidos e preferência por aftercare',
    });

    const cipherA = await service.encrypt(payload);
    const cipherB = await service.encrypt(payload);

    expect(cipherA).not.toBe(cipherB);
    expect(cipherA).not.toContain('Semáforo');
    expect(cipherA).not.toContain('safeword');

    expect(await service.decrypt(cipherA)).toBe(payload);
    expect(await service.decrypt(cipherB)).toBe(payload);
  });

  // Cenário: Persistência e reutilização da chave de sessão no sessionStorage.
  // Objetivo: Garantir que a mesma chave da sessão seja reutilizada entre chamadas e novas instâncias na mesma sessão.
  it('should persist session key in sessionStorage and reuse it across service instances in the same session', async () => {
    const key1 = await service.getOrInitializeSessionKey();
    const storedBase64 = sessionStorage.getItem(SESSION_CRYPTO_KEY_STORAGE);
    expect(storedBase64).toBeTruthy();

    const encrypted = await service.encrypt('dados-da-sessao', key1);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const freshInstance = TestBed.inject(CryptoService);

    const decrypted = await freshInstance.decrypt(encrypted);
    expect(decrypted).toBe('dados-da-sessao');
    expect(sessionStorage.getItem(SESSION_CRYPTO_KEY_STORAGE)).toBe(storedBase64);
  });

  // Cenário: Chave corrompida no sessionStorage ou bloqueio de acesso ao sessionStorage.
  // Objetivo: Recuperar substituindo chave corrompida e manter chave apenas em memória caso sessionStorage falhe.
  it('should recover from corrupted sessionStorage key and degrade cleanly when sessionStorage throws', async () => {
    sessionStorage.setItem(SESSION_CRYPTO_KEY_STORAGE, 'invalid-base64!!!');

    const recoveredKey = await service.getOrInitializeSessionKey();
    const cipher = await service.encrypt('ok', recoveredKey);
    expect(await service.decrypt(cipher, recoveredKey)).toBe('ok');
    expect(sessionStorage.getItem(SESSION_CRYPTO_KEY_STORAGE)).not.toBe('invalid-base64!!!');

    service.resetSessionKey();
    expect(sessionStorage.getItem(SESSION_CRYPTO_KEY_STORAGE)).toBeNull();

    const sessionDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError');
      },
    });

    try {
      const memoryKey = await service.getOrInitializeSessionKey();
      const enc = await service.encrypt('in-memory', memoryKey);
      expect(await service.decrypt(enc, memoryKey)).toBe('in-memory');
    } finally {
      if (sessionDescriptor) {
        Object.defineProperty(globalThis, 'sessionStorage', sessionDescriptor);
      }
    }
  });

  // Cenário: Descriptografia com outra chave, ciphertext adulterado ou resetSessionKey().
  // Objetivo: Rejeitar payloads adulterados ou criptografados por outra sessão/chave.
  it('should reject tampered payloads and fail decryption after resetSessionKey()', async () => {
    const keyA = await service.generateKey();
    const keyB = await service.generateKey();

    const cipher = await service.encrypt('segredo', keyA);
    await expect(service.decrypt(cipher, keyB)).rejects.toThrow();

    const rawBytes = Uint8Array.from(atob(cipher), (c) => c.codePointAt(0) ?? 0);
    rawBytes[rawBytes.length - 1] ^= 0xff;
    const tampered = btoa(Array.from(rawBytes, (b) => String.fromCodePoint(b)).join(''));
    await expect(service.decrypt(tampered, keyA)).rejects.toThrow();
    await expect(service.decrypt(btoa('short'), keyA)).rejects.toThrow();

    const sessionCipher = await service.encrypt('sessao-antiga');
    service.resetSessionKey();
    await expect(service.decrypt(sessionCipher)).rejects.toThrow();
  });
});
