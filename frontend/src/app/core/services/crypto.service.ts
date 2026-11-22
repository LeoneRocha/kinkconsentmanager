import { Injectable } from '@angular/core';

export const SESSION_CRYPTO_KEY_STORAGE = 'kcm_session_crypto_key_v1';

const AES_GCM_ALGORITHM = 'AES-GCM';
const AES_KEY_LENGTH = 256;
const AES_GCM_IV_LENGTH = 12;

/**
 * Client-side Web Crypto AES-GCM (256-bit) encryption service with per-session
 * keys persisted in browser sessionStorage.
 */
@Injectable({ providedIn: 'root' })
export class CryptoService {
  private sessionKeyPromise: Promise<CryptoKey> | null = null;

  /**
   * Returns whether native Web Crypto API (`crypto.subtle` and `getRandomValues`) is available.
   */
  isSupported(): boolean {
    const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
    return Boolean(cryptoApi?.subtle && typeof cryptoApi.getRandomValues === 'function');
  }

  /**
   * Generates an extractable 256-bit AES-GCM CryptoKey.
   */
  async generateKey(): Promise<CryptoKey> {
    const subtle = this.requireSubtle();
    return subtle.generateKey(
      { name: AES_GCM_ALGORITHM, length: AES_KEY_LENGTH },
      true,
      ['encrypt', 'decrypt'],
    );
  }

  /**
   * Exports a CryptoKey as a raw Base64-encoded string.
   */
  async exportKey(key: CryptoKey): Promise<string> {
    const subtle = this.requireSubtle();
    const rawBuffer = await subtle.exportKey('raw', key);
    return this.bytesToBase64(new Uint8Array(rawBuffer));
  }

  /**
   * Imports a raw Base64-encoded AES-GCM 256-bit key.
   */
  async importKey(base64Key: string): Promise<CryptoKey> {
    const subtle = this.requireSubtle();
    const rawBytes = this.base64ToBytes(base64Key);
    return subtle.importKey(
      'raw',
      rawBytes,
      { name: AES_GCM_ALGORITHM, length: AES_KEY_LENGTH },
      true,
      ['encrypt', 'decrypt'],
    );
  }

  /**
   * Returns the active session CryptoKey, importing an existing key from sessionStorage
   * when available or generating and persisting a fresh key for the current session.
   */
  getOrInitializeSessionKey(): Promise<CryptoKey> {
    this.sessionKeyPromise ??= this.resolveOrCreateSessionKey().catch((error: unknown) => {
      this.sessionKeyPromise = null;
      throw error;
    });
    return this.sessionKeyPromise;
  }

  /**
   * Clears the cached session key and removes its stored copy from sessionStorage.
   */
  resetSessionKey(): void {
    this.sessionKeyPromise = null;
    const storage = this.getSessionStorage();
    if (!storage) {
      return;
    }

    try {
      storage.removeItem(SESSION_CRYPTO_KEY_STORAGE);
    } catch {
      // Ignore storage errors in restricted browsing contexts.
    }
  }

  /**
   * Encrypts UTF-8 plaintext with AES-GCM (random 12-byte IV prepended to ciphertext, Base64 encoded).
   */
  async encrypt(plaintext: string, key?: CryptoKey): Promise<string> {
    const subtle = this.requireSubtle();
    const cryptoApi = this.requireCrypto();
    const activeKey = key ?? (await this.getOrInitializeSessionKey());

    const iv = cryptoApi.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH));
    const encoded = new TextEncoder().encode(plaintext);
    const encryptedBuffer = await subtle.encrypt(
      { name: AES_GCM_ALGORITHM, iv },
      activeKey,
      encoded,
    );

    const encryptedBytes = new Uint8Array(encryptedBuffer);
    const combined = new Uint8Array(iv.length + encryptedBytes.length);
    combined.set(iv, 0);
    combined.set(encryptedBytes, iv.length);

    return this.bytesToBase64(combined);
  }

  /**
   * Decrypts a Base64-encoded AES-GCM payload produced by `encrypt`.
   */
  async decrypt(ciphertextBase64: string, key?: CryptoKey): Promise<string> {
    const subtle = this.requireSubtle();
    const activeKey = key ?? (await this.getOrInitializeSessionKey());

    const combined = this.base64ToBytes(ciphertextBase64);
    if (combined.length <= AES_GCM_IV_LENGTH) {
      throw new Error('Encrypted payload is malformed or truncated.');
    }

    const iv = combined.slice(0, AES_GCM_IV_LENGTH);
    const cipherBytes = combined.slice(AES_GCM_IV_LENGTH);
    const decryptedBuffer = await subtle.decrypt(
      { name: AES_GCM_ALGORITHM, iv },
      activeKey,
      cipherBytes,
    );

    return new TextDecoder().decode(decryptedBuffer);
  }

  private async resolveOrCreateSessionKey(): Promise<CryptoKey> {
    const storage = this.getSessionStorage();
    if (storage) {
      try {
        const persistedBase64 = storage.getItem(SESSION_CRYPTO_KEY_STORAGE);
        if (persistedBase64 && persistedBase64.trim().length > 0) {
          return await this.importKey(persistedBase64);
        }
      } catch {
        try {
          storage.removeItem(SESSION_CRYPTO_KEY_STORAGE);
        } catch {
          // Ignore cleanup errors when storage access is denied.
        }
      }
    }

    const generatedKey = await this.generateKey();

    if (storage) {
      try {
        const exported = await this.exportKey(generatedKey);
        storage.setItem(SESSION_CRYPTO_KEY_STORAGE, exported);
      } catch {
        // Fallback: keep key in memory for the current session lifecycle.
      }
    }

    return generatedKey;
  }

  private requireCrypto(): Crypto {
    if (!this.isSupported()) {
      throw new Error('Web Crypto API is not available in this environment.');
    }
    return globalThis.crypto;
  }

  private requireSubtle(): SubtleCrypto {
    return this.requireCrypto().subtle;
  }

  private getSessionStorage(): Storage | null {
    try {
      if (typeof globalThis !== 'undefined' && 'sessionStorage' in globalThis) {
        return globalThis.sessionStorage ?? null;
      }
      return null;
    } catch {
      return null;
    }
  }

  private bytesToBase64(bytes: Uint8Array): string {
    const binary = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('');
    return btoa(binary);
  }

  private base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.codePointAt(i) ?? 0;
    }
    return bytes;
  }
}
