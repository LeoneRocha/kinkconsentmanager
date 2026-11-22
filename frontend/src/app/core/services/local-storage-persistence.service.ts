import { inject, Injectable } from '@angular/core';
import { StorageService } from './storage.service';

export const CHECKLIST_STORAGE_KEY = 'kcm_checklist_state_v1';

/**
 * Fault-tolerant checklist persistence wrapper delegating storage operations to `StorageService`.
 */
@Injectable({ providedIn: 'root' })
export class LocalStoragePersistenceService {
  private readonly storage = inject(StorageService);

  /**
   * Serializes and persists data under the given key, returning false when storage fails.
   */
  save<T>(data: T, key: string = CHECKLIST_STORAGE_KEY): boolean {
    return this.storage.setLocal(key, data);
  }

  /**
   * Reads and parses strict JSON data from storage, returning null on missing or corrupted payloads.
   */
  load<T>(key: string = CHECKLIST_STORAGE_KEY): T | null {
    return this.storage.getLocalJson<T>(key);
  }

  /**
   * Removes the stored entry for the given key without throwing on restricted storage.
   */
  clear(key: string = CHECKLIST_STORAGE_KEY): void {
    this.storage.removeLocal(key);
  }
}
