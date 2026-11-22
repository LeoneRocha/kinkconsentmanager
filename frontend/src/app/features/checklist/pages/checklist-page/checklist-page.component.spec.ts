import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ChecklistSchema } from '../../../../core/models';
import { ISchemaRepository, SCHEMA_REPOSITORY_TOKEN } from '../../../../core/repositories';
import {
  ChecklistAutosaveService,
  ChecklistStateService,
  I18nService,
} from '../../../../core/services';
import { ChecklistPageComponent } from './checklist-page.component';

const MOCK_SCHEMA: ChecklistSchema = {
  schemaVersion: '1.0.0',
  scales: [
    { id: 'hard_limit', order: 1, color: '#D32F2F', contrastColor: '#FFFFFF', icon: 'pi pi-ban' },
    {
      id: 'soft_limit',
      order: 2,
      color: '#F57C00',
      contrastColor: '#111827',
      icon: 'pi pi-exclamation-triangle',
    },
    {
      id: 'curious',
      order: 3,
      color: '#FBC02D',
      contrastColor: '#111827',
      icon: 'pi pi-question-circle',
    },
    { id: 'enjoy', order: 4, color: '#388E3C', contrastColor: '#FFFFFF', icon: 'pi pi-thumbs-up' },
    { id: 'favorite', order: 5, color: '#7B1FA2', contrastColor: '#FFFFFF', icon: 'pi pi-heart-fill' },
  ],
  groups: [
    {
      id: 'grp_safety',
      order: 1,
      defaultDualRole: false,
      rolePairId: 'general',
      items: [
        { id: 'item_safeword', type: 'single_choice', options: ['opt_traffic', 'opt_word'] },
      ],
    },
    {
      id: 'grp_bondage',
      order: 2,
      defaultDualRole: true,
      rolePairId: 'giving_receiving',
      items: [
        { id: 'item_rope', type: 'scale_matrix', dualRole: true },
      ],
    },
  ],
};

const PT_BR_TRANSLATIONS = {
  ui: {
    title: 'KinkConsentManager',
    subtitle: 'Checklist de Limites',
    languageLabel: 'Idioma',
    accordionMode: 'Guiado (Accordion)',
    fullMode: 'Visão Completa',
    quickFillButton: 'Preenchimento Rápido',
    searchPlaceholder: 'Buscar prática...',
    onlyUnanswered: 'Apenas não respondidos',
    clearAll: 'Limpar tudo',
    clearConfirmTitle: 'Limpar todas as respostas?',
    clearConfirmMessage: 'Todas as marcações serão removidas.',
    confirmYes: 'Sim, limpar',
    confirmNo: 'Cancelar',
    nextCategory: 'Próxima Categoria',
    finishAndExport: 'Finalizar e Exportar',
    noResults: 'Nenhum item encontrado.',
    loadingError: 'Erro ao carregar checklist.',
    retry: 'Tentar novamente',
    progressLabel: 'Progresso',
    otherOptionLabel: 'Outro',
    otherOptionPlaceholder: 'Especifique...',
    notAnswered: 'Não respondido',
    navExport: 'Exportar',
    quickFillTitle: 'Preenchimento Rápido',
    quickFillPrev: 'Anterior',
    quickFillNext: 'Próximo',
    quickFillClearKey: 'Limpar (0)',
    quickFillShortcutHint: 'Use 1-5.',
    quickFillEmpty: 'Sem itens.',
    quickFillClose: 'Fechar',
    loadingSchema: 'Carregando...',
    privacyNotice: 'Privacidade local.',
    legendTitle: 'Legenda',
    quickNavTitle: 'Categorias',
    clearSelection: 'Limpar seleção',
  },
  scales: {
    hard_limit: 'Limite Rígido',
    soft_limit: 'Limite Flexível',
    curious: 'Curiosidade',
    enjoy: 'Gosto',
    favorite: 'Favorito',
  },
  roles: {
    general: { primary: 'Geral' },
    giving_receiving: { primary: 'Ativo', secondary: 'Passivo' },
  },
  groups: {
    grp_safety: { title: 'Segurança', description: 'Cuidados prévios.' },
    grp_bondage: { title: 'Bondage', description: 'Cordas e contenção.' },
  },
  items: {
    item_safeword: { label: 'Sistema de Safeword' },
    item_rope: { label: 'Bondage com Cordas' },
  },
  options: {
    opt_traffic: 'Semáforo',
    opt_word: 'Palavra-chave',
  },
};

const EN_US_TRANSLATIONS = {
  ui: {
    title: 'KinkConsentManager',
    subtitle: 'Limits Checklist',
    languageLabel: 'Language',
    accordionMode: 'Guided (Accordion)',
    fullMode: 'Full View',
    quickFillButton: 'Quick Fill',
    searchPlaceholder: 'Search practice...',
    onlyUnanswered: 'Only unanswered',
    clearAll: 'Clear all',
    clearConfirmTitle: 'Clear all responses?',
    clearConfirmMessage: 'All selections will be removed.',
    confirmYes: 'Yes, clear all',
    confirmNo: 'Cancel',
    nextCategory: 'Next Category',
    finishAndExport: 'Finish & Export',
    noResults: 'No items matched.',
    loadingError: 'Unable to load checklist.',
    retry: 'Retry',
    progressLabel: 'Progress',
    otherOptionLabel: 'Other',
    otherOptionPlaceholder: 'Specify...',
    notAnswered: 'Not answered',
    navExport: 'Export',
    quickFillTitle: 'Quick-Fill Wizard',
    quickFillPrev: 'Previous',
    quickFillNext: 'Next',
    quickFillClearKey: 'Clear (0)',
    quickFillShortcutHint: 'Use 1-5.',
    quickFillEmpty: 'No items.',
    quickFillClose: 'Close',
    loadingSchema: 'Loading...',
    privacyNotice: 'Local privacy.',
    legendTitle: 'Legend',
    quickNavTitle: 'Categories',
    clearSelection: 'Clear selection',
  },
  scales: {
    hard_limit: 'Hard Limit',
    soft_limit: 'Soft Limit',
    curious: 'Curious',
    enjoy: 'Enjoy',
    favorite: 'Favorite',
  },
  roles: {
    general: { primary: 'General' },
    giving_receiving: { primary: 'Giving', secondary: 'Receiving' },
  },
  groups: {
    grp_safety: { title: 'Safety', description: 'Pre-scene agreements.' },
    grp_bondage: { title: 'Bondage', description: 'Ropes and restraints.' },
  },
  items: {
    item_safeword: { label: 'Safeword System' },
    item_rope: { label: 'Rope Restraint' },
  },
  options: {
    opt_traffic: 'Traffic Light',
    opt_word: 'Custom Word',
  },
};

describe('ChecklistPageComponent', () => {
  let fixture: ComponentFixture<ChecklistPageComponent>;
  let checklistState: ChecklistStateService;
  let autosaveService: ChecklistAutosaveService;
  let i18nService: I18nService;
  let router: Router;
  let getChecklistSchemaMock: jest.Mock<Observable<ChecklistSchema>, [version?: string]>;

  const createTestModule = async (
    schemaFactory: () => Observable<ChecklistSchema>,
  ): Promise<void> => {
    localStorage.clear();
    sessionStorage.clear();
    getChecklistSchemaMock = jest.fn(schemaFactory);
    const repoMock: ISchemaRepository = {
      getChecklistSchema: getChecklistSchemaMock,
    };

    await TestBed.configureTestingModule({
      imports: [ChecklistPageComponent],
      providers: [
        provideRouter([]),
        provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' }),
        { provide: SCHEMA_REPOSITORY_TOKEN, useValue: repoMock },
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', PT_BR_TRANSLATIONS);
    translate.setTranslation('en-US', EN_US_TRANSLATIONS);

    checklistState = TestBed.inject(ChecklistStateService);
    autosaveService = TestBed.inject(ChecklistAutosaveService);
    i18nService = TestBed.inject(I18nService);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(ChecklistPageComponent);
  };

  afterEach(() => {
    autosaveService?.stop();
    fixture?.destroy();
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();
    jest.restoreAllMocks();
  });

  it('should show p-skeleton while schema is loading and render checklist once resolved', async () => {
    const schemaSubject = new Subject<ChecklistSchema>();
    await createTestModule(() => schemaSubject.asObservable());

    fixture.detectChanges();
    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelectorAll('p-skeleton').length).toBeGreaterThan(0);
    expect(hostEl.querySelector('app-checklist-header')).toBeNull();

    schemaSubject.next(MOCK_SCHEMA);
    schemaSubject.complete();
    await fixture.whenStable();

    expect(getChecklistSchemaMock).toHaveBeenCalledWith('v1');
    expect(hostEl.querySelectorAll('p-skeleton').length).toBe(0);
    expect(hostEl.querySelector('app-checklist-header')).not.toBeNull();
    expect(hostEl.querySelector('app-checklist-stepper')).not.toBeNull();
    expect(checklistState.schema()).toEqual(MOCK_SCHEMA);
  });

  it('should render error state when schema loading fails and retry cleanly', async () => {
    let attempt = 0;
    await createTestModule(() => {
      attempt += 1;
      return attempt === 1
        ? throwError(() => new Error('Network failure'))
        : of(MOCK_SCHEMA);
    });

    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;
    const errorEl = hostEl.querySelector('.checklist-page__error');
    expect(errorEl).not.toBeNull();
    expect(errorEl?.textContent).toContain('Erro ao carregar checklist.');

    const retryBtn = hostEl.querySelector<HTMLButtonElement>('.checklist-page__retry-btn');
    expect(retryBtn).not.toBeNull();
    retryBtn!.click();
    await fixture.whenStable();

    expect(getChecklistSchemaMock).toHaveBeenCalledTimes(2);
    expect(hostEl.querySelector('.checklist-page__error')).toBeNull();
    expect(hostEl.querySelector('app-checklist-stepper')).not.toBeNull();
  });

  it('should propagate item answers to ChecklistStateService and switch across stepper, classic, and full views', async () => {
    await createTestModule(() => of(MOCK_SCHEMA));
    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;
    const radios = hostEl.querySelectorAll<HTMLInputElement>('p-radiobutton input[type="radio"]');
    radios[0].click();
    await fixture.whenStable();

    expect(checklistState.answers()['item_safeword']).toEqual({ selectedOption: 'opt_traffic' });
    expect(checklistState.answeredItemsCount()).toBe(1);
    expect(checklistState.progressPercentage()).toBe(50);

    // Switch to classic view and then full view
    const modeButtons = hostEl.querySelectorAll<HTMLElement>(
      '.checklist-header__mode-select p-togglebutton',
    );
    expect(modeButtons.length).toBe(3);

    modeButtons[1].click();
    await fixture.whenStable();
    expect(checklistState.viewMode()).toBe('classic');
    expect(hostEl.querySelector('app-classic-kink-sheet')).not.toBeNull();
    expect(hostEl.querySelector('app-checklist-stepper')).toBeNull();

    modeButtons[2].click();
    await fixture.whenStable();
    expect(checklistState.viewMode()).toBe('full');
    expect(hostEl.querySelector('app-full-view-container')).not.toBeNull();
    expect(hostEl.querySelector('app-classic-kink-sheet')).toBeNull();
  });

  it('should switch language without losing answers and update searchable labels via effect', async () => {
    await createTestModule(() => of(MOCK_SCHEMA));
    await fixture.whenStable();

    checklistState.setItemAnswer('item_rope', { primaryScale: 'enjoy' });
    await fixture.whenStable();

    // Initially pt-BR: searching English label "Rope Restraint" yields no match
    checklistState.setSearchQuery('Rope Restraint');
    await fixture.whenStable();
    expect(checklistState.filteredGroups()).toEqual([]);

    // Switch language via header SelectButton to en-US
    const hostEl = fixture.nativeElement as HTMLElement;
    const langButtons = hostEl.querySelectorAll<HTMLElement>(
      '.checklist-header__lang-select p-togglebutton',
    );
    langButtons[1].click();
    await fixture.whenStable();

    expect(i18nService.currentLang()).toBe('en-US');
    // Answers preserved
    expect(checklistState.answers()['item_rope']).toEqual({ primaryScale: 'enjoy' });
    // Searchable labels updated via effect -> English search matches item_rope!
    expect(checklistState.filteredGroups().length).toBe(1);
    expect(checklistState.filteredGroups()[0].items[0].id).toBe('item_rope');
  });

  it('should advance through stepper steps into expanded final review accordion and navigate to /export', async () => {
    await createTestModule(() => of(MOCK_SCHEMA));
    await fixture.whenStable();

    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    const hostEl = fixture.nativeElement as HTMLElement;

    expect(checklistState.activeCategoryIndex()).toBe(0);

    // Step 1 -> Step 2 (Bondage)
    hostEl.querySelector<HTMLButtonElement>('.stepper__next-btn')?.click();
    await fixture.whenStable();
    expect(checklistState.activeCategoryIndex()).toBe(1);
    expect(navigateSpy).not.toHaveBeenCalled();

    // Step 2 -> Final Review Accordion (all panels expanded)
    hostEl.querySelector<HTMLButtonElement>('.stepper__next-btn')?.click();
    await fixture.whenStable();
    expect(hostEl.querySelector('.stepper__panel--review')).not.toBeNull();
    const expandedPanels = hostEl.querySelectorAll('p-accordion-panel.p-accordionpanel-active');
    expect(expandedPanels.length).toBe(2);

    // Finish -> /export
    const finishBtn = hostEl.querySelector<HTMLButtonElement>('.stepper__finish-btn');
    expect(finishBtn).not.toBeNull();
    finishBtn!.click();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith(['/export']);
  });

  it('should open ConfirmationService dialog on clearAll and reset answers only when accepted', async () => {
    await createTestModule(() => of(MOCK_SCHEMA));
    await fixture.whenStable();

    checklistState.setItemAnswer('item_safeword', { selectedOption: 'opt_traffic' });
    await fixture.whenStable();

    const confirmationService = fixture.debugElement.injector.get(ConfirmationService);
    const confirmSpy = jest.spyOn(confirmationService, 'confirm');
    const clearAutosaveSpy = jest.spyOn(autosaveService, 'clearAutosave');

    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelector('.checklist-page__autosave')?.textContent).toContain(
      'Autosave criptografado ativo',
    );
    const clearBtn = hostEl.querySelector<HTMLButtonElement>('.checklist-header__clear-btn');
    expect(clearBtn?.disabled).toBe(false);
    clearBtn!.click();
    await fixture.whenStable();

    expect(confirmSpy).toHaveBeenCalledTimes(1);

    // Reject first -> answers remain
    const rejectBtn = document.body.querySelector<HTMLButtonElement>(
      '.p-confirmdialog-reject-button',
    );
    expect(rejectBtn).not.toBeNull();
    rejectBtn!.click();
    await fixture.whenStable();
    expect(checklistState.answers()['item_safeword']).toEqual({ selectedOption: 'opt_traffic' });
    expect(clearAutosaveSpy).not.toHaveBeenCalled();

    // Trigger again and accept -> answers and encrypted autosave cleared
    clearBtn!.click();
    await fixture.whenStable();
    const acceptBtn = document.body.querySelector<HTMLButtonElement>(
      '.p-confirmdialog-accept-button',
    );
    expect(acceptBtn).not.toBeNull();
    acceptBtn!.click();
    await fixture.whenStable();

    expect(checklistState.answers()).toEqual({});
    expect(checklistState.answeredItemsCount()).toBe(0);
    expect(clearAutosaveSpy).toHaveBeenCalledTimes(1);
  });

  it('should open QuickFillWizardModalComponent and propagate wizard answers to ChecklistStateService', async () => {
    await createTestModule(() => of(MOCK_SCHEMA));
    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;
    hostEl.querySelector<HTMLButtonElement>('.checklist-header__quick-fill-btn')?.click();
    await fixture.whenStable();

    expect(hostEl.querySelector('.quick-fill')).not.toBeNull();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }));
    await fixture.whenStable();

    expect(checklistState.answers()['item_rope']).toEqual({ primaryScale: 'favorite' });
  });
});
