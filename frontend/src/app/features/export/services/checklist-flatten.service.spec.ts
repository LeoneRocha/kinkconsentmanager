import { TestBed } from '@angular/core/testing';
import {
  ChecklistSchema,
  ItemResponseValue,
  OTHER_OPTION_VALUE,
  ResolvedPreviewTexts,
} from '../../../core/models';
import { ChecklistFlattenService } from './checklist-flatten.service';

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
    {
      id: 'enjoy',
      order: 4,
      color: '#388E3C',
      contrastColor: '#FFFFFF',
      icon: 'pi pi-check-circle',
    },
    {
      id: 'favorite',
      order: 5,
      color: '#7B1FA2',
      contrastColor: '#FFFFFF',
      icon: 'pi pi-heart-fill',
    },
  ],
  groups: [
    {
      id: 'grp_bondage',
      order: 2,
      defaultDualRole: true,
      rolePairId: 'giving_receiving',
      items: [
        { id: 'item_rope', type: 'scale_matrix' },
        {
          id: 'item_collar',
          type: 'scale_matrix',
          rolePairId: 'dominant_submissive',
        },
        {
          id: 'item_self_tie',
          type: 'scale_matrix',
          dualRole: false,
          rolePairId: 'general',
        },
      ],
    },
    {
      id: 'grp_safety',
      order: 1,
      defaultDualRole: false,
      rolePairId: 'general',
      items: [
        {
          id: 'item_safeword',
          type: 'single_choice',
          options: ['opt_traffic', 'opt_custom'],
          allowOtherOption: true,
        },
        {
          id: 'item_aftercare',
          type: 'multiple_choice',
          options: ['opt_cuddle', 'opt_water'],
          allowOtherOption: true,
        },
        {
          id: 'item_allergies',
          type: 'restricted_text',
          maxLength: 300,
        },
      ],
    },
  ],
};

const MOCK_TEXTS: ResolvedPreviewTexts = {
  title: 'Checklist',
  schemaVersionLabel: 'Schema Version',
  generatedAtLabel: 'Generated at',
  generatedAtValue: '2026-11-22 18:00',
  notAnsweredLabel: 'Not answered',
  otherLabel: 'Other',
  scales: {
    hard_limit: 'Hard Limit',
    soft_limit: 'Soft Limit',
    curious: 'Curious',
    enjoy: 'Enjoy',
    favorite: 'Favorite',
  },
  roles: {
    giving_receiving: { primary: 'Giving', secondary: 'Receiving' },
    dominant_submissive: { primary: 'Dominant', secondary: 'Submissive' },
    general: { primary: 'General' },
  },
  groups: {
    grp_safety: { title: 'Safety & Health' },
    grp_bondage: { title: 'Bondage' },
  },
  items: {
    item_safeword: { label: 'Safeword System' },
    item_aftercare: { label: 'Aftercare' },
    item_allergies: { label: 'Allergies' },
    item_rope: { label: 'Rope Bondage' },
    item_collar: { label: 'Collar Protocol' },
    item_self_tie: { label: 'Self-tying' },
  },
  options: {
    opt_traffic: 'Traffic Light',
    opt_custom: 'Custom Word',
    opt_cuddle: 'Cuddling',
    opt_water: 'Hydration',
  },
};

describe('ChecklistFlattenService', () => {
  let service: ChecklistFlattenService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChecklistFlattenService);
  });

  it('should sort groups by order without mutating the source schema', () => {
    const originalFirstGroupId = MOCK_SCHEMA.groups[0].id;
    const rows = service.flatten(MOCK_SCHEMA, {}, MOCK_TEXTS);

    expect(MOCK_SCHEMA.groups[0].id).toBe(originalFirstGroupId);
    expect(rows.map((row) => row.itemId)).toEqual([
      'item_safeword',
      'item_aftercare',
      'item_allergies',
      'item_rope',
      'item_collar',
      'item_self_tie',
    ]);
  });

  it('should resolve dual-role and single-role scale_matrix items with colors and notAnsweredLabel', () => {
    const answers: Readonly<Record<string, ItemResponseValue>> = {
      item_rope: { primaryScale: 'enjoy', secondaryScale: 'favorite' },
      item_collar: { primaryScale: 'curious' },
      item_self_tie: { primaryScale: 'hard_limit' },
    };

    const rows = service.flatten(MOCK_SCHEMA, answers, MOCK_TEXTS);
    const rope = rows.find((r) => r.itemId === 'item_rope');
    const collar = rows.find((r) => r.itemId === 'item_collar');
    const selfTie = rows.find((r) => r.itemId === 'item_self_tie');

    expect(rope).toEqual({
      groupId: 'grp_bondage',
      groupTitle: 'Bondage',
      itemId: 'item_rope',
      itemLabel: 'Rope Bondage',
      isDualRole: true,
      primaryRoleLabel: 'Giving',
      secondaryRoleLabel: 'Receiving',
      primaryValueLabel: 'Enjoy',
      secondaryValueLabel: 'Favorite',
      primaryColor: '#388E3C',
      secondaryColor: '#7B1FA2',
      selectedOptionsLabels: [],
      customNote: '',
    });

    expect(collar).toEqual({
      groupId: 'grp_bondage',
      groupTitle: 'Bondage',
      itemId: 'item_collar',
      itemLabel: 'Collar Protocol',
      isDualRole: true,
      primaryRoleLabel: 'Dominant',
      secondaryRoleLabel: 'Submissive',
      primaryValueLabel: 'Curious',
      secondaryValueLabel: 'Not answered',
      primaryColor: '#FBC02D',
      selectedOptionsLabels: [],
      customNote: '',
    });

    expect(selfTie).toEqual({
      groupId: 'grp_bondage',
      groupTitle: 'Bondage',
      itemId: 'item_self_tie',
      itemLabel: 'Self-tying',
      isDualRole: false,
      primaryRoleLabel: 'General',
      primaryValueLabel: 'Hard Limit',
      primaryColor: '#D32F2F',
      selectedOptionsLabels: [],
      customNote: '',
    });
  });

  it('should resolve single_choice, multiple_choice with __other__, and restricted_text items', () => {
    const answers: Readonly<Record<string, ItemResponseValue>> = {
      item_safeword: { selectedOption: OTHER_OPTION_VALUE, otherText: 'Hand squeeze' },
      item_aftercare: {
        selectedOptions: ['opt_cuddle', OTHER_OPTION_VALUE],
        otherText: 'Warm tea',
      },
      item_allergies: { customText: 'No latex gloves' },
    };

    const rows = service.flatten(MOCK_SCHEMA, answers, MOCK_TEXTS);
    const safeword = rows.find((r) => r.itemId === 'item_safeword');
    const aftercare = rows.find((r) => r.itemId === 'item_aftercare');
    const allergies = rows.find((r) => r.itemId === 'item_allergies');

    expect(safeword).toEqual({
      groupId: 'grp_safety',
      groupTitle: 'Safety & Health',
      itemId: 'item_safeword',
      itemLabel: 'Safeword System',
      isDualRole: false,
      primaryRoleLabel: 'General',
      primaryValueLabel: 'Other: Hand squeeze',
      selectedOptionsLabels: ['Other'],
      customNote: 'Hand squeeze',
    });

    expect(aftercare).toEqual({
      groupId: 'grp_safety',
      groupTitle: 'Safety & Health',
      itemId: 'item_aftercare',
      itemLabel: 'Aftercare',
      isDualRole: false,
      primaryRoleLabel: 'General',
      primaryValueLabel: 'Cuddling, Other: Warm tea',
      selectedOptionsLabels: ['Cuddling', 'Other'],
      customNote: 'Warm tea',
    });

    expect(allergies).toEqual({
      groupId: 'grp_safety',
      groupTitle: 'Safety & Health',
      itemId: 'item_allergies',
      itemLabel: 'Allergies',
      isDualRole: false,
      primaryRoleLabel: 'General',
      primaryValueLabel: 'No latex gloves',
      selectedOptionsLabels: [],
      customNote: 'No latex gloves',
    });
  });

  it('should mark unanswered and whitespace-only text items with texts.notAnsweredLabel', () => {
    const answers: Readonly<Record<string, ItemResponseValue>> = {
      item_safeword: { selectedOption: 'opt_traffic' },
      item_allergies: { customText: '   ' },
    };

    const rows = service.flatten(MOCK_SCHEMA, answers, MOCK_TEXTS);
    const safeword = rows.find((r) => r.itemId === 'item_safeword');
    const aftercare = rows.find((r) => r.itemId === 'item_aftercare');
    const allergies = rows.find((r) => r.itemId === 'item_allergies');

    expect(safeword?.selectedOptionsLabels).toEqual(['Traffic Light']);
    expect(safeword?.customNote).toBe('');
    expect(aftercare?.primaryValueLabel).toBe('Not answered');
    expect(aftercare?.selectedOptionsLabels).toEqual([]);
    expect(allergies?.primaryValueLabel).toBe('Not answered');
    expect(allergies?.customNote).toBe('');
  });
});
