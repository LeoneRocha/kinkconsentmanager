import { TestBed } from '@angular/core/testing';
import {
  CHECKLIST_STORAGE_KEY,
  LocalStoragePersistenceService,
} from './local-storage-persistence.service';

describe('LocalStoragePersistenceService', () => {
  let service: LocalStoragePersistenceService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocalStoragePersistenceService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('should save and load serialized state accurately under default key', () => {
    const payload = {
      schemaVersion: '1.0.0',
      answers: { rope: { primaryScale: 'enjoy', secondaryScale: 'curious' } },
      activeCategoryIndex: 2,
    };

    const saved = service.save(payload);

    expect(saved).toBe(true);
    expect(localStorage.getItem(CHECKLIST_STORAGE_KEY)).not.toBeNull();
    expect(service.load<typeof payload>()).toEqual(payload);
  });

  it('should return null when no data is stored', () => {
    expect(service.load()).toBeNull();
  });

  it('should return null without throwing when stored JSON is corrupted', () => {
    localStorage.setItem(CHECKLIST_STORAGE_KEY, '{corrupted-json');

    expect(() => service.load()).not.toThrow();
    expect(service.load()).toBeNull();
  });

  it('should handle QuotaExceededError gracefully and return false', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    const saved = service.save({ big: 'payload' });
    expect(saved).toBe(false);
  });

  it('should clear stored key when clear() is called', () => {
    service.save({ test: 123 });
    expect(localStorage.getItem(CHECKLIST_STORAGE_KEY)).not.toBeNull();

    service.clear();
    expect(localStorage.getItem(CHECKLIST_STORAGE_KEY)).toBeNull();
    expect(service.load()).toBeNull();
  });

  it('should handle inaccessible localStorage safely across all operations', () => {
    jest.spyOn(globalThis, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Access denied', 'SecurityError');
    });

    expect(service.save({ test: true })).toBe(false);
    expect(service.load()).toBeNull();
    expect(() => service.clear()).not.toThrow();
  });
});
