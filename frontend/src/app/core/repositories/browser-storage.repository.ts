import { inject, Injectable, InjectionToken } from '@angular/core';
import { StorageOptions, StorageScope, StorageService } from '../services/storage.service';

/**
 * Abstract repository contract over browser storage scopes (localStorage / sessionStorage).
 */
export interface IBrowserStorageRepository {
  get<T>(key: string, scope?: StorageScope): T | null;
  set<T>(key: string, value: T, options?: StorageOptions, scope?: StorageScope): boolean;
  getEncrypted<T>(key: string, scope?: StorageScope): Promise<T | null>;
  setEncrypted<T>(
    key: string,
    value: T,
    options?: StorageOptions,
    scope?: StorageScope,
  ): Promise<boolean>;
  remove(key: string, scope?: StorageScope): void;
  clear(scope?: StorageScope): void;
  keys(scope?: StorageScope): string[];
  size(scope?: StorageScope): number;
  cleanupExpired(scope?: StorageScope): number;
}

/**
 * Default browser storage repository backed by `StorageService`.
 */
@Injectable({ providedIn: 'root' })
export class BrowserStorageRepository implements IBrowserStorageRepository {
  private readonly storage = inject(StorageService);

  get<T>(key: string, scope: StorageScope = 'local'): T | null {
    return scope === 'session' ? this.storage.getSession<T>(key) : this.storage.getLocal<T>(key);
  }

  set<T>(key: string, value: T, options?: StorageOptions, scope: StorageScope = 'local'): boolean {
    return scope === 'session'
      ? this.storage.setSession(key, value, options)
      : this.storage.setLocal(key, value, options);
  }

  getEncrypted<T>(key: string, scope: StorageScope = 'local'): Promise<T | null> {
    return scope === 'session'
      ? this.storage.getSessionEncrypted<T>(key)
      : this.storage.getLocalEncrypted<T>(key);
  }

  setEncrypted<T>(
    key: string,
    value: T,
    options?: StorageOptions,
    scope: StorageScope = 'local',
  ): Promise<boolean> {
    return scope === 'session'
      ? this.storage.setSessionEncrypted(key, value, options)
      : this.storage.setLocalEncrypted(key, value, options);
  }

  remove(key: string, scope: StorageScope = 'local'): void {
    if (scope === 'session') {
      this.storage.removeSession(key);
      return;
    }
    this.storage.removeLocal(key);
  }

  clear(scope: StorageScope = 'local'): void {
    if (scope === 'session') {
      this.storage.clearSession();
      return;
    }
    this.storage.clearLocal();
  }

  keys(scope: StorageScope = 'local'): string[] {
    return scope === 'session'
      ? this.storage.getSessionStorageKeys()
      : this.storage.getLocalStorageKeys();
  }

  size(scope: StorageScope = 'local'): number {
    return scope === 'session'
      ? this.storage.getSessionStorageSize()
      : this.storage.getLocalStorageSize();
  }

  cleanupExpired(scope: StorageScope = 'local'): number {
    return scope === 'session'
      ? this.storage.cleanupExpiredSession()
      : this.storage.cleanupExpiredLocal();
  }
}

export const BROWSER_STORAGE_REPOSITORY_TOKEN = new InjectionToken<IBrowserStorageRepository>(
  'BROWSER_STORAGE_REPOSITORY',
  {
    providedIn: 'root',
    factory: () => inject(BrowserStorageRepository),
  },
);
