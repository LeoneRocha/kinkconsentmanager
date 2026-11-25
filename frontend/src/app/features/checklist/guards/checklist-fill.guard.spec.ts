import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { ChecklistAutosaveService, ChecklistStateService } from '../../../core/services';
import { checklistFillGuard } from './checklist-fill.guard';

describe('checklistFillGuard', () => {
  let checklistState: ChecklistStateService;
  let autosave: ChecklistAutosaveService;

  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = { url: '/checklist/fill' } as RouterStateSnapshot;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' }),
      ],
    });

    checklistState = TestBed.inject(ChecklistStateService);
    autosave = TestBed.inject(ChecklistAutosaveService);
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.restoreAllMocks();
  });

  // Cenário: Acesso direto a `/checklist/fill` sem escolha de modo nem estado salvo.
  // Objetivo: Bloquear a entrada direta e redirecionar para `/checklist`.
  it('should redirect to /checklist when user has neither selected a mode nor saved progress', async () => {
    jest.spyOn(autosave, 'restoreFromAutosave').mockResolvedValue(false);

    const result = await TestBed.runInInjectionContext(() =>
      checklistFillGuard(dummyRoute, dummyState),
    );

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/checklist');
  });

  // Cenário: Acesso após confirmar o modo em `/checklist`.
  // Objetivo: Liberar navegação imediata para `/checklist/fill`.
  it('should allow access after confirmStartMode is called', async () => {
    checklistState.confirmStartMode('classic');

    const result = await TestBed.runInInjectionContext(() =>
      checklistFillGuard(dummyRoute, dummyState),
    );

    expect(result).toBe(true);
  });

  // Cenário: Acesso com preenchimento salvo recuperado do autosave criptografado.
  // Objetivo: Restaurar estado salvo e permitir entrada direta em `/checklist/fill`.
  it('should allow access when autosave restores saved answers', async () => {
    jest.spyOn(autosave, 'restoreFromAutosave').mockImplementation(async () => {
      checklistState.restoreFromEncryptedAutosave({
        schemaVersion: '1.0.0',
        viewMode: 'full',
        answers: { item_rope: { primaryScale: 'enjoy' } },
      });
      return true;
    });

    const result = await TestBed.runInInjectionContext(() =>
      checklistFillGuard(dummyRoute, dummyState),
    );

    expect(result).toBe(true);
  });
});
