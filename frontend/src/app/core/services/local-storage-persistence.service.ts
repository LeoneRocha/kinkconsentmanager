import { Injectable } from '@angular/core';

export const CHECKLIST_STORAGE_KEY = 'kcm_checklist_state_v1';

/**
 * Fault-tolerant wrapper around browser localStorage supporting SSR and restricted environments.
 */
@Injectable({ providedIn: 'root' })
export class LocalStoragePersistenceService {
  /**
   * Serializes and persists data under the given key, returning false when storage fails.
   */
  save<T>(data: T, key: string = CHECKLIST_STORAGE_KEY): boolean {
    const storage = this.getStorage();
    if (!storage) {
      return false;
    }

    try {
      const serialized = JSON.stringify(data);
      storage.setItem(key, serialized);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reads and parses JSON data from storage, returning null on missing or corrupted payloads.
   */
  load<T>(key: string = CHECKLIST_STORAGE_KEY): T | null {
    const storage = this.getStorage();
    if (!storage) {
      return null;
    }

    try {
      const raw = storage.getItem(key);
      if (raw === null) {
        return null;
      }
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /**
   * Removes the stored entry for the given key without throwing on restricted storage.
   */
  clear(key: string = CHECKLIST_STORAGE_KEY): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    try {
      storage.removeItem(key);
    } catch {
      // Ignore storage errors in restricted browsing modes.
    }
  }

  private getStorage(): Storage | null {
    try {
      if (
        typeof globalThis !== 'undefined' &&
        'localStorage' in globalThis &&
        globalThis.localStorage
      ) {
        return globalThis.localStorage;
      }
      return null;
    } catch {
      return null;
    }
  }
}
