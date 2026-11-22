import { inject, Injectable } from '@angular/core';
import { CryptoService } from './crypto.service';

export type StorageScope = 'local' | 'session';

export interface StorageOptions {
  readonly expiresInMs?: number;
}

interface StorageTtlEnvelope<T> {
  readonly __kcmStorageEnvelope: true;
  readonly value: T;
  readonly expiresAt: number;
}

interface StorageEncryptedEnvelope {
  readonly __kcmEncryptedEnvelope: true;
  readonly v: 1;
  readonly alg: 'AES-GCM';
  readonly payload: string;
  readonly expiresAt?: number;
}

function isTtlEnvelope(value: unknown): value is StorageTtlEnvelope<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>)['__kcmStorageEnvelope'] === true
  );
}

function isEncryptedEnvelope(value: unknown): value is StorageEncryptedEnvelope {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record['__kcmEncryptedEnvelope'] === true &&
    record['v'] === 1 &&
    record['alg'] === 'AES-GCM' &&
    typeof record['payload'] === 'string'
  );
}

/**
 * Unified, fault-tolerant browser storage service supporting localStorage, sessionStorage,
 * typed convenience accessors, AES-GCM encrypted storage, and optional TTL expiration envelopes.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly crypto = inject(CryptoService);
  readonly convenience = {
    local: {
      setString: (key: string, value: string, options?: StorageOptions): boolean =>
        this.setLocal(key, value, options),
      getString: (key: string): string | null => this.getLocal<string>(key),
      setNumber: (key: string, value: number, options?: StorageOptions): boolean =>
        this.setLocal(key, value, options),
      getNumber: (key: string): number | null => this.getLocal<number>(key),
      setBoolean: (key: string, value: boolean, options?: StorageOptions): boolean =>
        this.setLocal(key, value, options),
      getBoolean: (key: string): boolean | null => this.getLocal<boolean>(key),
      setArray: <T>(key: string, value: readonly T[], options?: StorageOptions): boolean =>
        this.setLocal(key, value, options),
      getArray: <T>(key: string): T[] | null => this.getLocal<T[]>(key),
      setObject: <T>(key: string, value: T, options?: StorageOptions): boolean =>
        this.setLocal(key, value, options),
      getObject: <T>(key: string): T | null => this.getLocal<T>(key),
    },
    session: {
      setString: (key: string, value: string, options?: StorageOptions): boolean =>
        this.setSession(key, value, options),
      getString: (key: string): string | null => this.getSession<string>(key),
      setNumber: (key: string, value: number, options?: StorageOptions): boolean =>
        this.setSession(key, value, options),
      getNumber: (key: string): number | null => this.getSession<number>(key),
      setBoolean: (key: string, value: boolean, options?: StorageOptions): boolean =>
        this.setSession(key, value, options),
      getBoolean: (key: string): boolean | null => this.getSession<boolean>(key),
      setArray: <T>(key: string, value: readonly T[], options?: StorageOptions): boolean =>
        this.setSession(key, value, options),
      getArray: <T>(key: string): T[] | null => this.getSession<T[]>(key),
      setObject: <T>(key: string, value: T, options?: StorageOptions): boolean =>
        this.setSession(key, value, options),
      getObject: <T>(key: string): T | null => this.getSession<T>(key),
    },
  };

  setLocal<T>(key: string, value: T, options?: StorageOptions): boolean {
    return this.writeToStorage('localStorage', key, value, options);
  }

  getLocal<T>(key: string): T | null {
    return this.readFromStorage<T>('localStorage', key, true);
  }

  getLocalJson<T>(key: string): T | null {
    return this.readFromStorage<T>('localStorage', key, false);
  }

  removeLocal(key: string): void {
    this.removeFromStorage('localStorage', key);
  }

  clearLocal(): void {
    this.clearStorage('localStorage');
  }

  getLocalStorageKeys(): string[] {
    return this.listStorageKeys('localStorage');
  }

  getLocalStorageSize(): number {
    return this.measureStorageSize('localStorage');
  }

  cleanupExpiredLocal(): number {
    return this.cleanupExpired('localStorage');
  }

  setSession<T>(key: string, value: T, options?: StorageOptions): boolean {
    return this.writeToStorage('sessionStorage', key, value, options);
  }

  getSession<T>(key: string): T | null {
    return this.readFromStorage<T>('sessionStorage', key);
  }

  removeSession(key: string): void {
    this.removeFromStorage('sessionStorage', key);
  }

  clearSession(): void {
    this.clearStorage('sessionStorage');
  }

  getSessionStorageKeys(): string[] {
    return this.listStorageKeys('sessionStorage');
  }

  getSessionStorageSize(): number {
    return this.measureStorageSize('sessionStorage');
  }

  cleanupExpiredSession(): number {
    return this.cleanupExpired('sessionStorage');
  }

  /**
   * Encrypts `value` as JSON using the active AES-GCM session key and stores it in localStorage.
   */
  setLocalEncrypted<T>(key: string, value: T, options?: StorageOptions): Promise<boolean> {
    return this.writeEncryptedToStorage('localStorage', key, value, options);
  }

  /**
   * Reads and decrypts an AES-GCM encrypted entry from localStorage using the active session key.
   */
  getLocalEncrypted<T>(key: string): Promise<T | null> {
    return this.readEncryptedFromStorage<T>('localStorage', key);
  }

  /**
   * Encrypts `value` as JSON using the active AES-GCM session key and stores it in sessionStorage.
   */
  setSessionEncrypted<T>(key: string, value: T, options?: StorageOptions): Promise<boolean> {
    return this.writeEncryptedToStorage('sessionStorage', key, value, options);
  }

  /**
   * Reads and decrypts an AES-GCM encrypted entry from sessionStorage using the active session key.
   */
  getSessionEncrypted<T>(key: string): Promise<T | null> {
    return this.readEncryptedFromStorage<T>('sessionStorage', key);
  }

  private getStorage(area: 'localStorage' | 'sessionStorage'): Storage | null {
    try {
      if (typeof globalThis !== 'undefined' && area in globalThis) {
        return globalThis[area] ?? null;
      }
      return null;
    } catch {
      return null;
    }
  }

  private writeToStorage<T>(
    area: 'localStorage' | 'sessionStorage',
    key: string,
    value: T,
    options?: StorageOptions,
  ): boolean {
    const storage = this.getStorage(area);
    if (!storage || !key) {
      return false;
    }

    try {
      const payload: unknown =
        options?.expiresInMs !== undefined && Number.isFinite(options.expiresInMs)
          ? ({
              __kcmStorageEnvelope: true,
              value,
              expiresAt: Date.now() + Math.max(0, options.expiresInMs),
            } satisfies StorageTtlEnvelope<T>)
          : value;

      const serialized = JSON.stringify(payload);
      if (typeof serialized !== 'string') {
        return false;
      }

      storage.setItem(key, serialized);
      return true;
    } catch {
      return false;
    }
  }

  private async writeEncryptedToStorage<T>(
    area: 'localStorage' | 'sessionStorage',
    key: string,
    value: T,
    options?: StorageOptions,
  ): Promise<boolean> {
    const storage = this.getStorage(area);
    if (!storage || !key || !this.crypto.isSupported()) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      if (typeof serialized !== 'string') {
        return false;
      }

      const encryptedPayload = await this.crypto.encrypt(serialized);
      const hasExpiry =
        options?.expiresInMs !== undefined && Number.isFinite(options.expiresInMs);

      const envelope: StorageEncryptedEnvelope = {
        __kcmEncryptedEnvelope: true,
        v: 1,
        alg: 'AES-GCM',
        payload: encryptedPayload,
        ...(hasExpiry ? { expiresAt: Date.now() + Math.max(0, options.expiresInMs!) } : {}),
      };

      storage.setItem(key, JSON.stringify(envelope));
      return true;
    } catch {
      return false;
    }
  }

  private async readEncryptedFromStorage<T>(
    area: 'localStorage' | 'sessionStorage',
    key: string,
  ): Promise<T | null> {
    const storage = this.getStorage(area);
    if (!storage || !key || !this.crypto.isSupported()) {
      return null;
    }

    try {
      const raw = storage.getItem(key);
      if (raw === null) {
        return null;
      }

      const parsed: unknown = JSON.parse(raw);
      if (!isEncryptedEnvelope(parsed)) {
        return null;
      }

      if (typeof parsed.expiresAt === 'number' && Date.now() > parsed.expiresAt) {
        storage.removeItem(key);
        return null;
      }

      const decryptedJson = await this.crypto.decrypt(parsed.payload);
      return JSON.parse(decryptedJson) as T;
    } catch {
      return null;
    }
  }

  private readFromStorage<T>(
    area: 'localStorage' | 'sessionStorage',
    key: string,
    fallbackToRaw = true,
  ): T | null {
    const storage = this.getStorage(area);
    if (!storage || !key) {
      return null;
    }

    try {
      const raw = storage.getItem(key);
      if (raw === null) {
        return null;
      }

      try {
        const parsed: unknown = JSON.parse(raw);
        if (isTtlEnvelope(parsed)) {
          if (typeof parsed.expiresAt === 'number' && Date.now() > parsed.expiresAt) {
            storage.removeItem(key);
            return null;
          }
          return parsed.value as T;
        }
        return parsed as T;
      } catch {
        // Fallback for non-JSON plain strings when caller allows raw string values.
        return fallbackToRaw ? (raw as unknown as T) : null;
      }
    } catch {
      return null;
    }
  }

  private removeFromStorage(area: 'localStorage' | 'sessionStorage', key: string): void {
    const storage = this.getStorage(area);
    if (!storage || !key) {
      return;
    }

    try {
      storage.removeItem(key);
    } catch {
      // Ignore storage access errors in restricted browsing contexts.
    }
  }

  private clearStorage(area: 'localStorage' | 'sessionStorage'): void {
    const storage = this.getStorage(area);
    if (!storage) {
      return;
    }

    try {
      storage.clear();
    } catch {
      // Ignore storage access errors in restricted browsing contexts.
    }
  }

  private listStorageKeys(area: 'localStorage' | 'sessionStorage'): string[] {
    const storage = this.getStorage(area);
    if (!storage) {
      return [];
    }

    try {
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (key !== null) {
          keys.push(key);
        }
      }
      return keys;
    } catch {
      return [];
    }
  }

  private measureStorageSize(area: 'localStorage' | 'sessionStorage'): number {
    const storage = this.getStorage(area);
    if (!storage) {
      return 0;
    }

    try {
      let bytes = 0;
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (key !== null) {
          const val = storage.getItem(key) ?? '';
          bytes += (key.length + val.length) * 2;
        }
      }
      return bytes;
    } catch {
      return 0;
    }
  }

  private cleanupExpired(area: 'localStorage' | 'sessionStorage'): number {
    const storage = this.getStorage(area);
    if (!storage) {
      return 0;
    }

    let removed = 0;
    const keys = this.listStorageKeys(area);

    for (const key of keys) {
      try {
        const raw = storage.getItem(key);
        if (!raw) {
          continue;
        }
        const parsed: unknown = JSON.parse(raw);
        if (
          (isTtlEnvelope(parsed) || isEncryptedEnvelope(parsed)) &&
          typeof parsed.expiresAt === 'number' &&
          Date.now() > parsed.expiresAt
        ) {
          storage.removeItem(key);
          removed += 1;
        }
      } catch {
        // Non-JSON entries do not carry expiration envelopes.
      }
    }

    return removed;
  }
}
