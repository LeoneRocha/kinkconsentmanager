import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { CloudChecklistDto, UpsertCloudChecklistRequest } from '../models';
import { API_BASE_URL } from './base-data.service';
import { ChecklistCloudApiService } from './checklist-cloud-api.service';

const MOCK_CLOUD_CHECKLIST: CloudChecklistDto = {
  id: 10,
  schemaVersion: '1.0.0',
  language: 'pt-BR',
  answersJson: '{"item_rope":{"primaryScale":"enjoy"}}',
  clientUpdatedAtUtc: '2026-11-27T12:00:00.000Z',
  version: 2,
  createdAt: '2026-11-27T11:00:00.000Z',
  updatedAt: '2026-11-27T12:00:00.000Z',
};

describe('ChecklistCloudApiService', () => {
  let service: ChecklistCloudApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' }),
        { provide: API_BASE_URL, useValue: 'https://api.example.test' },
      ],
    });

    service = TestBed.inject(ChecklistCloudApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    jest.restoreAllMocks();
  });

  // Cenário: Consulta GET /api/v1/checklists/current retornando 200 OK e 404 Not Found.
  // Objetivo: Desempacotar CloudChecklistDto em 200 e mapear 404 para null sem lançar erro.
  it('should return CloudChecklistDto on 200 and null on 404', () => {
    let found: CloudChecklistDto | null | undefined;
    let missing: CloudChecklistDto | null | undefined = MOCK_CLOUD_CHECKLIST;

    service.getCurrentChecklist().subscribe((res) => {
      found = res;
    });
    const req200 = httpMock.expectOne('https://api.example.test/api/v1/checklists/current');
    expect(req200.request.method).toBe('GET');
    req200.flush({ isSuccess: true, statusCode: 200, data: MOCK_CLOUD_CHECKLIST });
    expect(found).toEqual(MOCK_CLOUD_CHECKLIST);

    service.getCurrentChecklist().subscribe((res) => {
      missing = res;
    });
    const req404 = httpMock.expectOne('https://api.example.test/api/v1/checklists/current');
    req404.flush({ isSuccess: false, statusCode: 404 }, { status: 404, statusText: 'Not Found' });
    expect(missing).toBeNull();
  });

  // Cenário: Envio de PUT /api/v1/checklists/current com sucesso (200) e conflito de versão (409).
  // Objetivo: Garantir retorno do DTO atualizado em 200 e propagação de HttpErrorResponse em 409.
  it('should upsert checklist via PUT and propagate 409 conflict', () => {
    const payload: UpsertCloudChecklistRequest = {
      schemaVersion: '1.0.0',
      language: 'pt-BR',
      answersJson: '{"item_rope":{"primaryScale":"favorite"}}',
      clientUpdatedAtUtc: '2026-11-27T12:05:00.000Z',
      expectedVersion: 1,
    };

    let updated: CloudChecklistDto | undefined;
    service.upsertCurrentChecklist(payload).subscribe((res) => {
      updated = res;
    });
    const putReq = httpMock.expectOne('https://api.example.test/api/v1/checklists/current');
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual(payload);
    putReq.flush({ isSuccess: true, statusCode: 200, data: MOCK_CLOUD_CHECKLIST });
    expect(updated).toEqual(MOCK_CLOUD_CHECKLIST);

    let conflictStatus: number | undefined;
    service.upsertCurrentChecklist(payload).subscribe({
      error: (err: HttpErrorResponse) => {
        conflictStatus = err.status;
      },
    });
    const conflictReq = httpMock.expectOne('https://api.example.test/api/v1/checklists/current');
    conflictReq.flush(
      { isSuccess: false, statusCode: 409, messageKey: 'Checklist.VersionConflict' },
      { status: 409, statusText: 'Conflict' },
    );
    expect(conflictStatus).toBe(409);
  });

  // Cenário: Exclusão remota via DELETE /api/v1/checklists/current.
  // Objetivo: Confirmar método HTTP DELETE e retorno booleano true.
  it('should delete checklist via DELETE /api/v1/checklists/current', () => {
    let deleted = false;
    service.deleteCurrentChecklist().subscribe((res) => {
      deleted = res;
    });

    const req = httpMock.expectOne('https://api.example.test/api/v1/checklists/current');
    expect(req.request.method).toBe('DELETE');
    req.flush({ isSuccess: true, statusCode: 200, data: true });
    expect(deleted).toBe(true);
  });
});
