import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { ChecklistSchema } from '../models';
import { ChecklistStateService } from './checklist-state.service';
import { I18nService, LANGUAGE_STORAGE_KEY } from './i18n.service';

const PT_BR_TRANSLATIONS = {
  ui: {
    greeting: 'Olá, {{name}}',
    preview: {
      title: 'Resumo de Consentimento',
      schemaVersion: 'Versão do Schema',
      generatedAt: 'Gerado em',
      notAnswered: 'Não respondido',
      other: 'Outro',
    },
  },
  scales: {
    hard_limit: 'Limite Rígido',
    enjoy: 'Gosto',
  },
  roles: {
    giving_receiving: { primary: 'Praticar (Dar)', secondary: 'Receber' },
    dominant_submissive: { primary: 'Dominador(a)', secondary: 'Submisso(a)' },
    self_partner: { primary: 'Em mim', secondary: 'No(a) parceiro(a)' },
    general: { primary: 'Avaliação Geral' },
  },
  groups: {
    bondage: {
      title: 'Bondage',
      description: 'Restrições físicas e cordas',
    },
    safety: {
      title: 'Segurança',
    },
  },
  items: {
    rope_bondage: {
      label: 'Bondage com cordas',
      tooltip: 'Uso de cordas de algodão ou juta',
    },
    safeword_system: {
      label: 'Sistema de Safeword',
    },
  },
  options: {
    traffic_light: 'Semáforo (Verde/Amarelo/Vermelho)',
  },
};

const EN_US_TRANSLATIONS = {
  ui: {
    greeting: 'Hello, {{name}}',
    preview: {
      title: 'Consent Summary',
      schemaVersion: 'Schema Version',
      generatedAt: 'Generated at',
      notAnswered: 'Not answered',
      other: 'Other',
    },
  },
  scales: {
    hard_limit: 'Hard Limit',
    enjoy: 'Enjoy',
    en_only_scale: 'English Fallback Scale',
  },
  roles: {
    giving_receiving: { primary: 'Giving', secondary: 'Receiving' },
    dominant_submissive: { primary: 'Dominant', secondary: 'Submissive' },
    self_partner: { primary: 'Self', secondary: 'Partner' },
    general: { primary: 'General Rating' },
  },
  groups: {
    bondage: {
      title: 'Bondage',
      description: 'Physical restraints and ropework',
    },
    safety: {
      title: 'Safety',
    },
  },
  items: {
    rope_bondage: {
      label: 'Rope bondage',
      tooltip: 'Use of cotton or jute ropes',
    },
    safeword_system: {
      label: 'Safeword System',
    },
    en_only_item: {
      label: 'Fallback Item Label',
    },
  },
  options: {
    traffic_light: 'Traffic Light (Green/Yellow/Red)',
  },
};

const SAMPLE_SCHEMA: ChecklistSchema = {
  schemaVersion: '1.0.0',
  scales: [
    {
      id: 'hard_limit',
      order: 1,
      color: '#d32f2f',
      contrastColor: '#ffffff',
      icon: 'pi pi-ban',
    },
    {
      id: 'enjoy',
      order: 2,
      color: '#388e3c',
      contrastColor: '#ffffff',
      icon: 'pi pi-check',
    },
  ],
  groups: [
    {
      id: 'bondage',
      order: 1,
      defaultDualRole: true,
      rolePairId: 'giving_receiving',
      items: [{ id: 'rope_bondage', type: 'scale_matrix', dualRole: true }],
    },
    {
      id: 'safety',
      order: 2,
      defaultDualRole: false,
      rolePairId: 'general',
      items: [
        {
          id: 'safeword_system',
          type: 'single_choice',
          options: ['traffic_light'],
        },
      ],
    },
  ],
};

describe('I18nService', () => {
  let service: I18nService;
  let translateService: TranslateService;
  let checklistState: ChecklistStateService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' })],
    });

    translateService = TestBed.inject(TranslateService);
    translateService.setTranslation('pt-BR', PT_BR_TRANSLATIONS);
    translateService.setTranslation('en-US', EN_US_TRANSLATIONS);

    service = TestBed.inject(I18nService);
    checklistState = TestBed.inject(ChecklistStateService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('should switch language signal, invoke TranslateService.use(), and persist preference', () => {
    expect(service.currentLang()).toBe('pt-BR');
    expect(service.translateUi('greeting', { name: 'Alex' })).toBe('Olá, Alex');

    const useSpy = jest.spyOn(translateService, 'use');
    service.setLanguage('en-US');

    expect(useSpy).toHaveBeenCalledWith('en-US');
    expect(service.currentLang()).toBe('en-US');
    expect(service.translateUi('greeting', { name: 'Alex' })).toBe('Hello, Alex');
    expect(JSON.parse(localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? '""')).toBe('en-US');
  });

  it('should fallback to fallbackLang when key is missing in active language and to ID when absent everywhere', () => {
    // Present in en-US (fallbackLang) but absent in pt-BR
    expect(service.getScaleLabel('en_only_scale')).toBe('English Fallback Scale');
    expect(service.getItemLabel('en_only_item')).toBe('Fallback Item Label');

    // Absent in both languages -> fallback to ID
    expect(service.getScaleLabel('unknown_scale')).toBe('unknown_scale');
    expect(service.getGroupTitle('unknown_group')).toBe('unknown_group');
    expect(service.getItemLabel('unknown_item')).toBe('unknown_item');
    expect(service.getOptionLabel('unknown_option')).toBe('unknown_option');
    expect(service.translateUi('nonexistent')).toBe('ui.nonexistent');
  });

  it('should return empty string for missing item tooltip and group description', () => {
    expect(service.getItemTooltip('rope_bondage')).toBe('Uso de cordas de algodão ou juta');
    expect(service.getItemTooltip('safeword_system')).toBe('');
    expect(service.getItemTooltip('missing_item')).toBe('');

    expect(service.getGroupDescription('bondage')).toBe('Restrições físicas e cordas');
    expect(service.getGroupDescription('safety')).toBe('');
    expect(service.getGroupDescription('missing_group')).toBe('');
  });

  it('should resolve all 4 RolePairId values accurately', () => {
    expect(service.getRoleLabels('giving_receiving')).toEqual({
      primary: 'Praticar (Dar)',
      secondary: 'Receber',
    });
    expect(service.getRoleLabels('dominant_submissive')).toEqual({
      primary: 'Dominador(a)',
      secondary: 'Submisso(a)',
    });
    expect(service.getRoleLabels('self_partner')).toEqual({
      primary: 'Em mim',
      secondary: 'No(a) parceiro(a)',
    });
    expect(service.getRoleLabels('general')).toEqual({
      primary: 'Avaliação Geral',
    });

    service.setLanguage('en-US');
    expect(service.getRoleLabels('giving_receiving')).toEqual({
      primary: 'Giving',
      secondary: 'Receiving',
    });
    expect(service.getRoleLabels('general')).toEqual({
      primary: 'General Rating',
    });
  });

  it('should build ResolvedPreviewTexts for the active language and schema', () => {
    const ptPreview = service.buildResolvedPreviewTexts(SAMPLE_SCHEMA, '22/11/2026');
    expect(ptPreview).toEqual({
      title: 'Resumo de Consentimento',
      schemaVersionLabel: 'Versão do Schema',
      generatedAtLabel: 'Gerado em',
      generatedAtValue: '22/11/2026',
      notAnsweredLabel: 'Não respondido',
      otherLabel: 'Outro',
      scales: {
        hard_limit: 'Limite Rígido',
        enjoy: 'Gosto',
      },
      roles: {
        giving_receiving: { primary: 'Praticar (Dar)', secondary: 'Receber' },
        dominant_submissive: { primary: 'Dominador(a)', secondary: 'Submisso(a)' },
        self_partner: { primary: 'Em mim', secondary: 'No(a) parceiro(a)' },
        general: { primary: 'Avaliação Geral' },
      },
      groups: {
        bondage: { title: 'Bondage', description: 'Restrições físicas e cordas' },
        safety: { title: 'Segurança' },
      },
      items: {
        rope_bondage: {
          label: 'Bondage com cordas',
          tooltip: 'Uso de cordas de algodão ou juta',
        },
        safeword_system: {
          label: 'Sistema de Safeword',
        },
      },
      options: {
        traffic_light: 'Semáforo (Verde/Amarelo/Vermelho)',
      },
    });

    service.setLanguage('en-US');
    const enPreview = service.buildResolvedPreviewTexts(SAMPLE_SCHEMA, '2026-11-22');
    expect(enPreview.title).toBe('Consent Summary');
    expect(enPreview.scales['hard_limit']).toBe('Hard Limit');
    expect(enPreview.items['rope_bondage']?.label).toBe('Rope bondage');
  });

  it('should NOT modify or reset ChecklistStateService answers when language changes', () => {
    checklistState.initializeSchema(SAMPLE_SCHEMA);
    checklistState.setItemAnswer('rope_bondage', {
      primaryScale: 'enjoy',
      secondaryScale: 'hard_limit',
    });
    checklistState.setItemAnswer('safeword_system', { selectedOption: 'traffic_light' });

    const beforeSwitch = checklistState.answers();
    service.setLanguage('en-US');
    service.setLanguage('pt-BR');

    expect(checklistState.answers()).toEqual(beforeSwitch);
    expect(checklistState.answeredItemsCount()).toBe(2);
  });

  it('should hydrate persisted language from localStorage and handle item-level rolePairId and fallback preview UI strings', () => {
    TestBed.resetTestingModule();
    localStorage.setItem(LANGUAGE_STORAGE_KEY, JSON.stringify('en-US'));
    TestBed.configureTestingModule({
      providers: [provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' })],
    });

    const freshTranslate = TestBed.inject(TranslateService);
    freshTranslate.setTranslation('en-US', {
      scales: { enjoy: 'Enjoy' },
      roles: { dominant_submissive: { primary: 'Dom', secondary: 'Sub' } },
      groups: { g1: { title: 'Group 1' } },
      items: { i1: { label: 'Item 1' } },
    });

    const freshI18n = TestBed.inject(I18nService);
    expect(freshI18n.currentLang()).toBe('en-US');

    const schemaWithItemRole: ChecklistSchema = {
      schemaVersion: '1.0.0',
      scales: [
        {
          id: 'enjoy',
          order: 1,
          color: '#388e3c',
          contrastColor: '#ffffff',
          icon: 'pi pi-check',
        },
      ],
      groups: [
        {
          id: 'g1',
          order: 1,
          defaultDualRole: false,
          rolePairId: 'general',
          items: [
            {
              id: 'i1',
              type: 'scale_matrix',
              dualRole: true,
              rolePairId: 'dominant_submissive',
            },
          ],
        },
      ],
    };

    const preview = freshI18n.buildResolvedPreviewTexts(schemaWithItemRole, '2026-11-22');
    expect(preview.title).toBe('KinkConsentManager');
    expect(preview.notAnsweredLabel).toBe('Not answered');
    expect(preview.roles['dominant_submissive']).toEqual({ primary: 'Dom', secondary: 'Sub' });
  });
});
