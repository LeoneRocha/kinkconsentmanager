import { TestBed } from '@angular/core/testing';
import { ChecklistDraft, ChecklistSchema, OTHER_OPTION_VALUE } from '../models';
import { ChecklistStateService } from './checklist-state.service';
import {
  CHECKLIST_STORAGE_KEY,
  LocalStoragePersistenceService,
} from './local-storage-persistence.service';

const TEST_SCHEMA: ChecklistSchema = {
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
      id: 'curious',
      order: 2,
      color: '#fbc02d',
      contrastColor: '#000000',
      icon: 'pi pi-question',
    },
    {
      id: 'enjoy',
      order: 3,
      color: '#388e3c',
      contrastColor: '#ffffff',
      icon: 'pi pi-check',
    },
    {
      id: 'favorite',
      order: 4,
      color: '#1976d2',
      contrastColor: '#ffffff',
      icon: 'pi pi-star',
    },
  ],
  groups: [
    {
      id: 'bondage',
      order: 1,
      defaultDualRole: true,
      rolePairId: 'giving_receiving',
      items: [
        { id: 'rope_bondage', type: 'scale_matrix', dualRole: true },
        { id: 'cuffs', type: 'scale_matrix', dualRole: false },
      ],
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
          options: ['traffic_light', 'custom_word'],
          allowOtherOption: true,
        },
        {
          id: 'aftercare_prefs',
          type: 'multiple_choice',
          options: ['cuddling', 'water', 'space'],
          allowOtherOption: true,
        },
        {
          id: 'medical_notes',
          type: 'restricted_text',
          maxLength: 300,
        },
      ],
    },
  ],
};

describe('ChecklistStateService', () => {
  let service: ChecklistStateService;
  let persistence: LocalStoragePersistenceService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    persistence = TestBed.inject(LocalStoragePersistenceService);
    service = TestBed.inject(ChecklistStateService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('should initialize with default state when storage is empty', () => {
    expect(service.schema()).toBeNull();
    expect(service.answers()).toEqual({});
    expect(service.viewMode()).toBe('stepper');
    expect(service.activeCategoryIndex()).toBe(0);
    expect(service.searchQuery()).toBe('');
    expect(service.onlyUnanswered()).toBe(false);
    expect(service.lastUpdatedAt()).toBeNull();
    expect(service.totalItemsCount()).toBe(0);
    expect(service.answeredItemsCount()).toBe(0);
    expect(service.progressPercentage()).toBe(0);
    expect(service.filteredGroups()).toEqual([]);
    expect(service.nextCategory()).toBe(false);
  });

  it('should hydrate non-sensitive navigation state and purge legacy plaintext answers on construction', () => {
    TestBed.resetTestingModule();
    localStorage.setItem(
      CHECKLIST_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: '1.0.0',
        answers: {
          rope_bondage: { primaryScale: 'enjoy', secondaryScale: 'curious' },
        },
        viewMode: 'full',
        activeCategoryIndex: 1,
        lastUpdatedAt: '2026-11-22T10:00:00.000Z',
      }),
    );

    TestBed.configureTestingModule({});
    const hydratedService = TestBed.inject(ChecklistStateService);
    const localPersistence = TestBed.inject(LocalStoragePersistenceService);

    expect(hydratedService.answers()).toEqual({});
    expect(hydratedService.viewMode()).toBe('full');
    expect(hydratedService.activeCategoryIndex()).toBe(1);
    expect(hydratedService.lastUpdatedAt()).toBeNull();

    const sanitized = localPersistence.load<Record<string, unknown>>();
    expect(sanitized).toEqual({
      schemaVersion: '1.0.0',
      viewMode: 'full',
      activeCategoryIndex: 1,
    });
  });

  it('should ignore persisted state if schemaVersion mismatches', () => {
    TestBed.resetTestingModule();
    localStorage.setItem(
      CHECKLIST_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: '0.9.0',
        answers: { rope_bondage: { primaryScale: 'enjoy' } },
        viewMode: 'full',
        activeCategoryIndex: 3,
      }),
    );

    TestBed.configureTestingModule({});
    const freshService = TestBed.inject(ChecklistStateService);

    expect(freshService.answers()).toEqual({});
    expect(freshService.viewMode()).toBe('stepper');
    expect(freshService.activeCategoryIndex()).toBe(0);
  });

  // Cenário: Estado legado salvo com viewMode='accordion' e troca para 'classic'.
  // Objetivo: Migrar 'accordion' para 'stepper' na hidratação e persistir o novo modo 'classic'.
  it('should migrate legacy accordion persisted mode to stepper and persist classic mode', () => {
    TestBed.resetTestingModule();
    localStorage.setItem(
      CHECKLIST_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: '1.0.0',
        answers: {},
        viewMode: 'accordion',
        activeCategoryIndex: 0,
      }),
    );

    TestBed.configureTestingModule({});
    const migratedService = TestBed.inject(ChecklistStateService);
    expect(migratedService.viewMode()).toBe('stepper');

    migratedService.setViewMode('classic');
    expect(migratedService.viewMode()).toBe('classic');
    expect(persistence.load<{ viewMode: string }>()?.viewMode).toBe('classic');
  });

  it('should clamp activeCategoryIndex when initializeSchema is called', () => {
    service.setActiveCategory(10);
    expect(service.activeCategoryIndex()).toBe(10);

    service.initializeSchema(TEST_SCHEMA);
    expect(service.schema()).toEqual(TEST_SCHEMA);
    expect(service.activeCategoryIndex()).toBe(1);

    service.initializeSchema({ ...TEST_SCHEMA, groups: [] });
    expect(service.activeCategoryIndex()).toBe(0);
  });

  it('should update primaryScale without overwriting secondaryScale in dual-role mode and avoid plaintext storage', () => {
    service.initializeSchema(TEST_SCHEMA);

    service.setItemAnswer('rope_bondage', { primaryScale: 'enjoy' });
    service.setItemAnswer('rope_bondage', { secondaryScale: 'curious' });
    service.setItemAnswer('rope_bondage', { primaryScale: 'favorite' });

    expect(service.answers()['rope_bondage']).toEqual({
      primaryScale: 'favorite',
      secondaryScale: 'curious',
    });
    expect(service.lastUpdatedAt()).not.toBeNull();

    const stored = persistence.load<Record<string, unknown>>();
    expect(stored?.['answers']).toBeUndefined();
  });

  it('should remove item entry when all answer fields become empty and clear via clearItemAnswer', () => {
    service.initializeSchema(TEST_SCHEMA);

    service.setItemAnswer('rope_bondage', { primaryScale: 'enjoy', secondaryScale: 'curious' });
    service.setItemAnswer('rope_bondage', {
      primaryScale: undefined,
      secondaryScale: undefined,
    });
    expect(service.answers()['rope_bondage']).toBeUndefined();

    service.setItemAnswer('cuffs', { primaryScale: 'hard_limit' });
    expect(service.answers()['cuffs']).toEqual({ primaryScale: 'hard_limit' });

    service.clearItemAnswer('cuffs');
    expect(service.answers()['cuffs']).toBeUndefined();

    const beforeUpdatedAt = service.lastUpdatedAt();
    service.clearItemAnswer('nonexistent_item');
    expect(service.lastUpdatedAt()).toBe(beforeUpdatedAt);
  });

  it('should evaluate regular single_choice and multiple_choice options accurately', () => {
    service.initializeSchema(TEST_SCHEMA);

    service.setItemAnswer('safeword_system', { selectedOption: 'traffic_light' });
    service.setItemAnswer('aftercare_prefs', { selectedOptions: ['cuddling'] });
    expect(service.answeredItemsCount()).toBe(2);

    service.setItemAnswer('safeword_system', { selectedOption: '   ' });
    service.setItemAnswer('aftercare_prefs', { selectedOptions: [] });
    expect(service.answeredItemsCount()).toBe(0);
  });

  it('should calculate answeredItemsCount and progressPercentage accurately across all question types', () => {
    service.initializeSchema(TEST_SCHEMA);
    expect(service.totalItemsCount()).toBe(5);
    expect(service.answeredItemsCount()).toBe(0);
    expect(service.progressPercentage()).toBe(0);

    // 1. scale_matrix dual-role (either primary or secondary counts)
    service.setItemAnswer('rope_bondage', { secondaryScale: 'curious' });
    expect(service.answeredItemsCount()).toBe(1);
    expect(service.progressPercentage()).toBe(20);

    // 2. single_choice with OTHER_OPTION_VALUE requires non-whitespace otherText
    service.setItemAnswer('safeword_system', {
      selectedOption: OTHER_OPTION_VALUE,
      otherText: '   ',
    });
    expect(service.answeredItemsCount()).toBe(1);

    service.setItemAnswer('safeword_system', { otherText: 'Pineapple' });
    expect(service.answeredItemsCount()).toBe(2);

    // 3. multiple_choice: empty or only OTHER_OPTION_VALUE with whitespace doesn't count
    service.setItemAnswer('aftercare_prefs', {
      selectedOptions: [OTHER_OPTION_VALUE],
      otherText: '  ',
    });
    expect(service.answeredItemsCount()).toBe(2);

    // Adding a regular option alongside OTHER_OPTION_VALUE counts as answered
    service.setItemAnswer('aftercare_prefs', {
      selectedOptions: ['water', OTHER_OPTION_VALUE],
      otherText: '',
    });
    expect(service.answeredItemsCount()).toBe(3);

    // 4. restricted_text: whitespace-only does not count
    service.setItemAnswer('medical_notes', { customText: '   \n\t  ' });
    expect(service.answeredItemsCount()).toBe(3);

    service.setItemAnswer('medical_notes', { customText: 'Bad knee' });
    expect(service.answeredItemsCount()).toBe(4);
    expect(service.progressPercentage()).toBe(80);

    // 5. Complete last item
    service.setItemAnswer('cuffs', { primaryScale: 'enjoy' });
    expect(service.answeredItemsCount()).toBe(5);
    expect(service.progressPercentage()).toBe(100);
  });

  it('should filter groups by searchQuery (ID and translated labels) and onlyUnanswered simultaneously', () => {
    service.initializeSchema(TEST_SCHEMA);
    service.setSearchableLabels({
      rope_bondage: 'Bondage com Cordas',
      cuffs: 'Algemas',
      safeword_system: 'Sistema de Palavra de Segurança',
      aftercare_prefs: 'Preferências de Aftercare',
      medical_notes: 'Notas Médicas',
    });

    service.setItemAnswer('rope_bondage', { primaryScale: 'enjoy' });

    // Only unanswered hides rope_bondage, leaving cuffs in bondage + 3 items in safety
    service.setOnlyUnanswered(true);
    let groups = service.filteredGroups();
    expect(groups).toHaveLength(2);
    expect(groups[0].items.map((i) => i.id)).toEqual(['cuffs']);

    // Combined searchQuery matching translated label of answered item yields empty
    service.setSearchQuery('cordas');
    expect(service.filteredGroups()).toHaveLength(0);

    // Disabling onlyUnanswered reveals rope_bondage via label match
    service.setOnlyUnanswered(false);
    groups = service.filteredGroups();
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe('bondage');
    expect(groups[0].items.map((i) => i.id)).toEqual(['rope_bondage']);

    // Search by item ID (case-insensitive)
    service.setSearchQuery('AFTERCARE');
    groups = service.filteredGroups();
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe('safety');
    expect(groups[0].items.map((i) => i.id)).toEqual(['aftercare_prefs']);
  });

  it('should persist viewMode and navigate categories with nextCategory() boundary', () => {
    service.initializeSchema(TEST_SCHEMA);

    service.setViewMode('full');
    expect(service.viewMode()).toBe('full');
    expect(persistence.load<{ viewMode: string }>()?.viewMode).toBe('full');

    service.setActiveCategory(-5);
    expect(service.activeCategoryIndex()).toBe(0);

    expect(service.nextCategory()).toBe(true);
    expect(service.activeCategoryIndex()).toBe(1);
    expect(persistence.load<{ activeCategoryIndex: number }>()?.activeCategoryIndex).toBe(1);

    // At last group (index 1 of 2 groups), nextCategory returns false
    expect(service.nextCategory()).toBe(false);
    expect(service.activeCategoryIndex()).toBe(1);
  });

  it('should importDraft, exportDraftSnapshot, and restore normalized state from encrypted autosave', () => {
    service.initializeSchema(TEST_SCHEMA);

    const draft: ChecklistDraft = {
      schemaVersion: '1.0.0',
      exportedAt: '2026-11-22T09:00:00.000Z',
      language: 'en-US',
      answers: {
        cuffs: { primaryScale: 'favorite' },
        aftercare_prefs: { selectedOptions: ['cuddling', 'water'] },
      },
    };

    service.importDraft(draft);
    expect(service.answers()).toEqual(draft.answers);
    expect(service.answeredItemsCount()).toBe(2);
    expect(persistence.load<Record<string, unknown>>()?.['answers']).toBeUndefined();

    const exported = service.exportDraftSnapshot('pt-BR');
    expect(exported.schemaVersion).toBe('1.0.0');
    expect(exported.language).toBe('pt-BR');
    expect(exported.answers).toEqual(draft.answers);
    expect(exported.exportedAt).toBeTruthy();

    // Ensure exported snapshot arrays are decoupled from internal state
    expect(exported.answers['aftercare_prefs']?.selectedOptions).not.toBe(
      service.answers()['aftercare_prefs']?.selectedOptions,
    );

    // Incompatible schema version is ignored
    service.restoreFromEncryptedAutosave({
      schemaVersion: '9.9.9',
      answers: { cuffs: { primaryScale: 'hard_limit' } },
    });
    expect(service.answers()).toEqual(draft.answers);

    // Valid snapshot restores normalized answers and clamped navigation state
    service.restoreFromEncryptedAutosave({
      schemaVersion: '1.0.0',
      answers: {
        rope_bondage: { primaryScale: 'enjoy', secondaryScale: 'curious' },
      },
      viewMode: 'classic',
      activeCategoryIndex: 99,
      savedAt: '2026-11-22T15:30:00.000Z',
    });
    expect(service.answers()).toEqual({
      rope_bondage: { primaryScale: 'enjoy', secondaryScale: 'curious' },
    });
    expect(service.viewMode()).toBe('classic');
    expect(service.activeCategoryIndex()).toBe(1);
    expect(service.lastUpdatedAt()).toBe('2026-11-22T15:30:00.000Z');
  });

  it('should clear answers, reset activeCategoryIndex to 0, and clear persistence on resetAllAnswers()', () => {
    service.initializeSchema(TEST_SCHEMA);
    service.setItemAnswer('cuffs', { primaryScale: 'enjoy' });
    service.setActiveCategory(1);

    expect(persistence.load()).not.toBeNull();

    service.resetAllAnswers();

    expect(service.answers()).toEqual({});
    expect(service.activeCategoryIndex()).toBe(0);
    expect(service.lastUpdatedAt()).toBeNull();
    expect(service.answeredItemsCount()).toBe(0);
    expect(persistence.load()).toBeNull();
  });

  // Cenário: Resposta com a 6ª escala 'not_applicable' (Não se aplica) em item dual-role e persistência/importação.
  // Objetivo: Garantir que 'not_applicable' seja aceito, contabilizado como respondido e preservado na importação e snapshot criptografado.
  it('should accept, count, import, and restore not_applicable scale answers', () => {
    service.initializeSchema({
      ...TEST_SCHEMA,
      scales: [
        {
          id: 'not_applicable',
          value: 'not_applicable',
          order: 0,
          color: '#546E7A',
          contrastColor: '#FFFFFF',
          icon: 'fa-solid fa-circle-minus',
        },
        ...TEST_SCHEMA.scales,
      ],
    });

    service.setItemAnswer('rope_bondage', {
      primaryScale: 'not_applicable',
      secondaryScale: 'favorite',
    });

    expect(service.answers()['rope_bondage']).toEqual({
      primaryScale: 'not_applicable',
      secondaryScale: 'favorite',
    });
    expect(service.answeredItemsCount()).toBe(1);

    const draft: ChecklistDraft = {
      schemaVersion: '1.0.0',
      exportedAt: '2026-11-25T12:30:00.000Z',
      language: 'pt-BR',
      answers: {
        cuffs: { primaryScale: 'not_applicable' },
      },
    };
    service.importDraft(draft);
    expect(service.answers()['cuffs']).toEqual({ primaryScale: 'not_applicable' });

    service.restoreFromEncryptedAutosave({
      schemaVersion: '1.0.0',
      answers: {
        rope_bondage: { primaryScale: 'not_applicable', secondaryScale: 'enjoy' },
      },
    });
    expect(service.answers()['rope_bondage']).toEqual({
      primaryScale: 'not_applicable',
      secondaryScale: 'enjoy',
    });
  });

  // Cenário: Schema personalizado com escalas dinâmicas por grupo/item e valores customizados.
  // Objetivo: Garantir que ChecklistStateService aceite dinamicamente valores declarados no schema ativo e rejeite valores inexistentes.
  it('should dynamically validate scale answers against active schema scales, scaleSets, and item scales', () => {
    const customSchema: ChecklistSchema = {
      schemaVersion: '1.0.0',
      scales: [
        {
          id: 'custom_yes',
          value: 'yes_score_10',
          order: 1,
          label: 'Yes',
          color: '#16A34A',
          contrastColor: '#FFFFFF',
          icon: 'fa-solid fa-check',
        },
      ],
      scaleSets: {
        extra: [
          {
            id: 'set_maybe',
            value: 'set_maybe_val',
            order: 1,
            color: '#FBC02D',
            contrastColor: '#111827',
            icon: 'fa-solid fa-question',
          },
        ],
      },
      groups: [
        {
          id: 'grp_custom',
          order: 1,
          defaultDualRole: false,
          rolePairId: 'general',
          items: [
            {
              id: 'q_custom',
              type: 'scale_matrix',
              scales: [
                {
                  id: 'item_special',
                  value: 'special_val',
                  order: 1,
                  color: '#7B1FA2',
                  contrastColor: '#FFFFFF',
                  icon: 'fa-solid fa-heart',
                },
              ],
            },
          ],
        },
      ],
    };

    service.initializeSchema(customSchema);
    service.importDraft({
      schemaVersion: '1.0.0',
      exportedAt: '2026-11-25T12:45:00.000Z',
      language: 'pt-BR',
      answers: {
        q_custom: { primaryScale: 'special_val', secondaryScale: 'unknown_scale' },
      },
    });

    expect(service.answers()['q_custom']).toEqual({ primaryScale: 'special_val' });

    service.restoreFromEncryptedAutosave({
      schemaVersion: '1.0.0',
      answers: {
        q_custom: { primaryScale: 'yes_score_10', secondaryScale: 'set_maybe_val' },
      },
    });
    expect(service.answers()['q_custom']).toEqual({
      primaryScale: 'yes_score_10',
      secondaryScale: 'set_maybe_val',
    });
  });
});
