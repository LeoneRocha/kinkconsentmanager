import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { Observable, of, throwError } from 'rxjs';
import { ChecklistSchema } from '../../../../core/models';
import { SCHEMA_REPOSITORY_TOKEN } from '../../../../core/repositories';
import {
  ChecklistAutosaveService,
  ChecklistStateService,
  UiFeedbackHostService,
} from '../../../../core/services';
import { ChecklistStartPageComponent } from './checklist-start-page.component';

const MOCK_SCHEMA: ChecklistSchema = {
  schemaVersion: '1.0.0',
  scales: [
    { id: 'enjoy', order: 1, color: '#388E3C', contrastColor: '#FFFFFF', icon: 'pi pi-check' },
  ],
  groups: [
    {
      id: 'grp_safety',
      order: 1,
      defaultDualRole: false,
      rolePairId: 'general',
      items: [{ id: 'item_safeword', type: 'single_choice', options: ['opt_traffic'] }],
    },
  ],
};

describe('ChecklistStartPageComponent', () => {
  let fixture: ComponentFixture<ChecklistStartPageComponent>;
  let checklistState: ChecklistStateService;
  let autosaveService: ChecklistAutosaveService;
  let feedbackHost: UiFeedbackHostService;
  let router: Router;
  let getChecklistSchemaMock: jest.Mock<Observable<ChecklistSchema>, [version?: string]>;

  const setup = async (
    schemaFactory: () => Observable<ChecklistSchema> = () => of(MOCK_SCHEMA),
  ): Promise<void> => {
    localStorage.clear();
    sessionStorage.clear();
    getChecklistSchemaMock = jest.fn(schemaFactory);

    await TestBed.configureTestingModule({
      imports: [ChecklistStartPageComponent],
      providers: [
        provideRouter([]),
        provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' }),
        {
          provide: SCHEMA_REPOSITORY_TOKEN,
          useValue: { getChecklistSchema: getChecklistSchemaMock },
        },
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', {
      ui: {
        backToDashboard: 'Voltar ao Dashboard',
        loadingSchema: 'Carregando...',
        loadingError: 'Erro ao carregar checklist.',
        retry: 'Tentar novamente',
        fullMode: 'Visão Completa',
        quickFillButton: 'Preenchimento Rápido',
        importJson: 'Importar JSON',
        importSuccess: 'Rascunho JSON importado e restaurado com sucesso.',
        importErrorInvalidJson: 'Arquivo inválido.',
        importErrorIncompatibleVersion: 'Versão do schema incompatível.',
        notificationOkAction: 'OK',
      },
    });
    translate.use('pt-BR');

    checklistState = TestBed.inject(ChecklistStateService);
    autosaveService = TestBed.inject(ChecklistAutosaveService);
    feedbackHost = TestBed.inject(UiFeedbackHostService);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(ChecklistStartPageComponent);
    await fixture.whenStable();
  };

  afterEach(() => {
    feedbackHost?.dismissAll();
    autosaveService?.stop();
    fixture?.destroy();
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();
    jest.restoreAllMocks();
  });

  // Cenário: Erro ao carregar schema na rota `/checklist` e recuperação via Retry.
  // Objetivo: Exibir alerta de erro e renderizar o seletor de modos após nova tentativa bem-sucedida.
  it('should display error alert on schema load failure and recover on retry', async () => {
    let attempt = 0;
    await setup(() => {
      attempt += 1;
      return attempt === 1 ? throwError(() => new Error('Failed')) : of(MOCK_SCHEMA);
    });

    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelector('.checklist-start__error')).not.toBeNull();

    hostEl.querySelector<HTMLButtonElement>('.checklist-start__retry-btn')?.click();
    await fixture.whenStable();

    expect(getChecklistSchemaMock).toHaveBeenCalledTimes(2);
    expect(hostEl.querySelector('.checklist-start__error')).toBeNull();
    expect(hostEl.querySelector('app-checklist-mode-selector')).not.toBeNull();
  });

  // Cenário: Escolha do modo de preenchimento na rota `/checklist`.
  // Objetivo: Confirmar viewMode no estado, omitir botão redundante de Dashboard e navegar para `/checklist/fill`.
  it('should confirm selected mode and navigate to /checklist/fill without a dashboard back button', async () => {
    await setup();
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    const hostEl = fixture.nativeElement as HTMLElement;

    expect(hostEl.querySelector('button[data-action="back-to-dashboard"]')).toBeNull();

    hostEl.querySelector<HTMLButtonElement>('button[data-start-mode="classic"]')?.click();
    expect(checklistState.viewMode()).toBe('classic');
    expect(checklistState.hasConfirmedStartMode()).toBe(true);
    expect(navigateSpy).toHaveBeenCalledWith(['/checklist', 'fill']);
  });

  // Cenário: Importação de JSON válido vs inválido na tela inicial `/checklist`.
  // Objetivo: Permanecer em `/checklist` com erro quando JSON inválido e navegar para `/checklist/fill` ao restaurar JSON válido.
  it('should stay on /checklist on invalid JSON import and navigate to /checklist/fill on valid JSON import', async () => {
    await setup();
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    const errorSpy = jest.spyOn(feedbackHost, 'error');
    const successSpy = jest.spyOn(feedbackHost, 'success');
    const hostEl = fixture.nativeElement as HTMLElement;
    const fileInput = hostEl.querySelector<HTMLInputElement>(
      'app-checklist-mode-selector input[type="file"]',
    )!;

    const createFile = (content: string, name: string): File => {
      const file = new File([content], name, { type: 'application/json' });
      Object.defineProperty(file, 'text', {
        value: () => Promise.resolve(content),
        configurable: true,
      });
      return file;
    };

    const invalidFile = createFile('{invalid', 'bad.json');
    Object.defineProperty(fileInput, 'files', {
      value: { 0: invalidFile, length: 1, item: (i: number) => (i === 0 ? invalidFile : null) },
      configurable: true,
    });
    fileInput.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Arquivo inválido.'),
      expect.objectContaining({ actionLabel: 'OK', duration: 5000 }),
    );
    expect(navigateSpy).not.toHaveBeenCalled();

    const validFile = createFile(
      JSON.stringify({
        schemaVersion: '1.0.0',
        exportedAt: '2026-11-25T00:00:00.000Z',
        language: 'pt-BR',
        answers: { item_safeword: { selectedOption: 'opt_traffic' } },
      }),
      'draft.json',
    );
    Object.defineProperty(fileInput, 'files', {
      value: { 0: validFile, length: 1, item: (i: number) => (i === 0 ? validFile : null) },
      configurable: true,
    });
    fileInput.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(checklistState.answers()['item_safeword']).toEqual({ selectedOption: 'opt_traffic' });
    expect(checklistState.hasConfirmedStartMode()).toBe(true);
    expect(successSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/checklist', 'fill']);
  });
});
