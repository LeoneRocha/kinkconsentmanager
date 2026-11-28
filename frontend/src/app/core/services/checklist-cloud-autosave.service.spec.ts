import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { CloudChecklistDto } from '../models';
import { API_BASE_URL } from './base-data.service';
import {
  CHECKLIST_ONLINE_AUTOSAVE_ENABLED_KEY,
  ChecklistCloudAutosaveService,
} from './checklist-cloud-autosave.service';
import {
  CHECKLIST_ENCRYPTED_AUTOSAVE_KEY,
  ChecklistLocalAutosaveService,
} from './checklist-local-autosave.service';
import { ChecklistStateService } from './checklist-state.service';
import { CryptoService } from './crypto.service';
import { UiFeedbackHostService } from './ui-feedback-host.service';

describe('ChecklistCloudAutosaveService', () => {
  let service: ChecklistCloudAutosaveService;
  let localAutosave: ChecklistLocalAutosaveService;
  let checklistState: ChecklistStateService;
  let cryptoService: CryptoService;
  let httpMock: HttpTestingController;
  let feedbackHost: UiFeedbackHostService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' }),
        { provide: API_BASE_URL, useValue: 'https://api.example.test' },
      ],
    });

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', {
      ui: {
        cloudSyncConflictTitle: 'Conflito',
        cloudSyncConflictMessage: 'Escolha uma versão.',
        cloudSyncConflictUseOnline: 'Usar on-line',
        cloudSyncConflictUseLocal: 'Usar local',
      },
    });
    translate.use('pt-BR');

    service = TestBed.inject(ChecklistCloudAutosaveService);
    localAutosave = TestBed.inject(ChecklistLocalAutosaveService);
    checklistState = TestBed.inject(ChecklistStateService);
    cryptoService = TestBed.inject(CryptoService);
    httpMock = TestBed.inject(HttpTestingController);
    feedbackHost = TestBed.inject(UiFeedbackHostService);
  });

  afterEach(() => {
    cryptoService.resetSessionKey();
    httpMock.verify();
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();
    jest.restoreAllMocks();
  });

  // Cenário: Salvamento on-line, conflito 409 com recarregamento remoto e exclusão via DELETE.
  // Objetivo: Validar atualização de remoteVersion, tratamento de 409 optando pela versão on-line e resetSessionState().
  it('should save online, handle 409 reload choice, persist enabled preference, and delete remotely', async () => {
    service.setEnabled(false);
    expect(service.isEnabled()).toBe(false);
    expect(localStorage.getItem(CHECKLIST_ONLINE_AUTOSAVE_ENABLED_KEY)).toBe('false');
    service.setEnabled(true);

    checklistState.setItemAnswer('item_rope', { primaryScale: 'enjoy' });

    const savePromise = service.save();
    const put1 = httpMock.expectOne('https://api.example.test/api/v1/checklists/current');
    expect(put1.request.method).toBe('PUT');
    put1.flush({
      isSuccess: true,
      statusCode: 200,
      data: {
        id: 1,
        schemaVersion: '1.0.0',
        language: 'pt-BR',
        answersJson: put1.request.body.answersJson,
        clientUpdatedAtUtc: '2026-11-27T12:00:00.000Z',
        version: 1,
        createdAt: '2026-11-27T12:00:00.000Z',
        updatedAt: '2026-11-27T12:00:00.000Z',
      },
    });

    const result1 = await savePromise;
    expect(result1.saved).toBe(true);
    expect(service.remoteVersion()).toBe(1);
    expect(localStorage.getItem(CHECKLIST_ENCRYPTED_AUTOSAVE_KEY)).toBeNull();

    // Conflito 409 escolhendo "Usar on-line"
    jest.spyOn(feedbackHost, 'confirm').mockReturnValueOnce(of(true));
    const conflictPromise = service.save();
    const putConflict = httpMock.expectOne('https://api.example.test/api/v1/checklists/current');
    expect(putConflict.request.body.expectedVersion).toBe(1);
    putConflict.flush({}, { status: 409, statusText: 'Conflict' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const reloadGet = httpMock.expectOne('https://api.example.test/api/v1/checklists/current');
    expect(reloadGet.request.method).toBe('GET');
    const serverDto: CloudChecklistDto = {
      id: 1,
      schemaVersion: '1.0.0',
      language: 'pt-BR',
      answersJson: '{"item_rope":{"primaryScale":"favorite"}}',
      clientUpdatedAtUtc: '2026-11-27T12:10:00.000Z',
      version: 4,
      createdAt: '2026-11-27T12:00:00.000Z',
      updatedAt: '2026-11-27T12:10:00.000Z',
    };
    reloadGet.flush({ isSuccess: true, statusCode: 200, data: serverDto });

    const conflictResult = await conflictPromise;
    expect(conflictResult.saved).toBe(false);
    expect(conflictResult.reloadedFromCloud).toBe(true);
    expect(service.remoteVersion()).toBe(4);
    expect(checklistState.answers()).toEqual({ item_rope: { primaryScale: 'favorite' } });

    const deletePromise = service.deleteRemote();
    const delReq = httpMock.expectOne('https://api.example.test/api/v1/checklists/current');
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush({ isSuccess: true, statusCode: 200, data: true });
    expect(await deletePromise).toBe(true);
    expect(service.remoteVersion()).toBeNull();

    service.resetSessionState();
    expect(service.syncError()).toBe(false);
  });

  // Cenário: Divergência entre rascunho local e registro na nuvem durante restauração no login.
  // Objetivo: Exibir modal de confirmação e aplicar a versão escolhida removendo o rascunho local do localStorage.
  it('should resolve divergent local draft vs cloud checklist via confirmation dialog', async () => {
    checklistState.setItemAnswer('item_rope', { primaryScale: 'curious' });
    await localAutosave.save();
    expect(localAutosave.hasStoredDraft()).toBe(true);

    jest.spyOn(feedbackHost, 'confirm').mockReturnValueOnce(of(true));
    const restorePromise = service.restore({ force: true });

    const getReq = httpMock.expectOne('https://api.example.test/api/v1/checklists/current');
    getReq.flush({
      isSuccess: true,
      statusCode: 200,
      data: {
        id: 2,
        schemaVersion: '1.0.0',
        language: 'pt-BR',
        answersJson: '{"item_rope":{"primaryScale":"enjoy"}}',
        clientUpdatedAtUtc: '2026-11-27T12:20:00.000Z',
        version: 2,
        createdAt: '2026-11-27T12:00:00.000Z',
        updatedAt: '2026-11-27T12:20:00.000Z',
      },
    });

    const restored = await restorePromise;
    expect(restored.restored).toBe(true);
    expect(checklistState.answers()).toEqual({ item_rope: { primaryScale: 'enjoy' } });
    expect(localAutosave.hasStoredDraft()).toBe(false);
    expect(service.remoteVersion()).toBe(2);
  });
});
