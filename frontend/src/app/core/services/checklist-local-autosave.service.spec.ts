import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { BROWSER_STORAGE_REPOSITORY_TOKEN } from '../repositories';
import {
  CHECKLIST_AUTOSAVE_ENABLED_KEY,
  CHECKLIST_ENCRYPTED_AUTOSAVE_KEY,
  ChecklistLocalAutosaveService,
} from './checklist-local-autosave.service';
import { ChecklistStateService } from './checklist-state.service';
import { CryptoService, SESSION_CRYPTO_KEY_STORAGE } from './crypto.service';

describe('ChecklistLocalAutosaveService', () => {
  let service: ChecklistLocalAutosaveService;
  let checklistState: ChecklistStateService;
  let cryptoService: CryptoService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' })],
    });

    service = TestBed.inject(ChecklistLocalAutosaveService);
    checklistState = TestBed.inject(ChecklistStateService);
    cryptoService = TestBed.inject(CryptoService);
  });

  afterEach(() => {
    cryptoService.resetSessionKey();
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();
    jest.restoreAllMocks();
  });

  // Cenário: Persistência local criptografada AES-GCM e restauração na mesma sessão.
  // Objetivo: Garantir que save() não grave texto plano, hasStoredDraft() detecte o blob e restore() hidrate o estado.
  it('should encrypt answers in localStorage and restore them within the same session', async () => {
    service.initializeSessionKey();
    await cryptoService.getOrInitializeSessionKey();
    expect(sessionStorage.getItem(SESSION_CRYPTO_KEY_STORAGE)).toBeTruthy();

    checklistState.setItemAnswer('item_rope', { primaryScale: 'enjoy' });
    checklistState.setViewMode('classic');
    checklistState.setActiveCategory(1);

    const saveResult = await service.save();
    expect(saveResult.saved).toBe(true);
    expect(saveResult.savedAt).not.toBeNull();
    expect(service.hasStoredDraft()).toBe(true);

    const raw = localStorage.getItem(CHECKLIST_ENCRYPTED_AUTOSAVE_KEY);
    expect(raw).toContain('"__kcmEncryptedEnvelope":true');
    expect(raw).not.toContain('item_rope');

    checklistState.resetAllAnswers();
    service.resetRestoreAttempt();

    const restoreResult = await service.restore();
    expect(restoreResult.restored).toBe(true);
    expect(checklistState.answers()).toEqual({ item_rope: { primaryScale: 'enjoy' } });
    expect(checklistState.viewMode()).toBe('classic');
    expect(checklistState.activeCategoryIndex()).toBe(1);
  });

  // Cenário: Rotação de chave de sessão tornando blob anterior ilegível e alternância de preferência local.
  // Objetivo: Remover blob ilegível com segurança e persistir preferência booleana em localStorage.
  it('should remove unreadable blob after session key rotation and persist enabled preference', async () => {
    checklistState.setItemAnswer('item_rope', { primaryScale: 'favorite' });
    await service.save();

    cryptoService.resetSessionKey();
    checklistState.resetAllAnswers();

    const restored = await service.restore();
    expect(restored.restored).toBe(false);
    expect(service.hasStoredDraft()).toBe(false);

    const repo = TestBed.inject(BROWSER_STORAGE_REPOSITORY_TOKEN);
    service.setEnabled(false);
    expect(service.isEnabled()).toBe(false);
    expect(repo.get<boolean>(CHECKLIST_AUTOSAVE_ENABLED_KEY, 'local')).toBe(false);

    service.setEnabled(true);
    expect(service.isEnabled()).toBe(true);
    expect(repo.get<boolean>(CHECKLIST_AUTOSAVE_ENABLED_KEY, 'local')).toBe(true);
  });
});
