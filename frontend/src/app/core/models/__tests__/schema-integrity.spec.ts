import rawSchema from '../../../../assets/schemas/checklist-v1.json';
import rawPtBr from '../../../../assets/i18n/pt-BR.json';
import rawEnUs from '../../../../assets/i18n/en-US.json';
import rawPtBrGroups from '../../../../assets/i18n/groups/pt-BR.json';
import rawEnUsGroups from '../../../../assets/i18n/groups/en-US.json';
import rawPtBrQuestions from '../../../../assets/i18n/questions/pt-BR.json';
import rawEnUsQuestions from '../../../../assets/i18n/questions/en-US.json';
import {
  ALL_PARTICIPANT_ROLES,
  ChecklistSchema,
  ParticipantRoleId,
  QuestionType,
  RolePairId,
  ScaleId,
} from '../checklist-schema.model';

interface RoleTranslation {
  readonly primary: string;
  readonly secondary?: string;
}

interface GroupTranslation {
  readonly title: string;
  readonly description: string;
}

interface ItemTranslation {
  readonly label: string;
  readonly tooltip: string;
}

interface TranslationDictionary {
  readonly ui: Readonly<Record<string, string>>;
  readonly roles: Readonly<Record<string, RoleTranslation>>;
  readonly participantRoles: Readonly<Record<string, string>>;
  readonly scales: Readonly<Record<string, string>>;
  readonly groups: Readonly<Record<string, GroupTranslation>>;
  readonly items: Readonly<Record<string, ItemTranslation>>;
  readonly options: Readonly<Record<string, string>>;
}

const VALID_SCALE_IDS: readonly ScaleId[] = [
  'hard_limit',
  'soft_limit',
  'curious',
  'enjoy',
  'favorite',
  'not_applicable',
];

const VALID_QUESTION_TYPES: readonly QuestionType[] = [
  'scale_matrix',
  'single_choice',
  'multiple_choice',
  'restricted_text',
];

const VALID_ROLE_PAIR_IDS: readonly RolePairId[] = [
  'giving_receiving',
  'dominant_submissive',
  'self_partner',
  'general',
];

const DUAL_ROLE_PAIR_IDS: readonly RolePairId[] = [
  'giving_receiving',
  'dominant_submissive',
  'self_partner',
];

const REQUIRED_UI_KEYS: readonly string[] = [
  'title',
  'subtitle',
  'languageLabel',
  'accordionMode',
  'fullMode',
  'quickFillButton',
  'searchPlaceholder',
  'onlyUnanswered',
  'clearAll',
  'clearConfirmTitle',
  'clearConfirmMessage',
  'confirmYes',
  'confirmNo',
  'nextCategory',
  'finishAndExport',
  'noResults',
  'loadingError',
  'retry',
  'progressLabel',
  'otherOptionLabel',
  'otherOptionPlaceholder',
  'charactersRemaining',
  'notAnswered',
  'tooltipHint',
  'navChecklist',
  'navExport',
  'quickFillTitle',
  'quickFillPrev',
  'quickFillNext',
  'quickFillClearKey',
  'quickFillShortcutHint',
  'quickFillEmpty',
  'quickFillClose',
  'exportTitle',
  'exportSubtitle',
  'backToChecklist',
  'downloadPng',
  'downloadPdf',
  'exportJson',
  'importJson',
  'exportCsv',
  'schemaVersionLabel',
  'generatedAtLabel',
  'exportSuccess',
  'exportError',
  'importSuccess',
  'importErrorInvalidJson',
  'importErrorIncompatibleVersion',
  'previewHeading',
  'roleHeader',
  'valueHeader',
  'notesHeader',
];

const SEMVER_REGEX = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const ICON_CLASS_REGEX = /^fa-(?:solid|regular|brands) fa-[a-z0-9-]+$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function collectKeyPaths(
  node: unknown,
  prefix = '',
): { readonly paths: string[]; readonly emptyLeaves: string[] } {
  if (typeof node === 'string') {
    const emptyLeaves = node.trim().length === 0 ? [prefix] : [];
    return { paths: [prefix], emptyLeaves };
  }

  if (!isPlainObject(node)) {
    throw new Error(`Unexpected non-object, non-string translation node at "${prefix}"`);
  }

  const paths: string[] = [];
  const emptyLeaves: string[] = [];

  for (const key of Object.keys(node)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    const childResult = collectKeyPaths(node[key], fullPath);
    paths.push(...childResult.paths);
    emptyLeaves.push(...childResult.emptyLeaves);
  }

  return {
    paths: paths.sort(),
    emptyLeaves,
  };
}

describe('Checklist Schema & i18n Integrity', () => {
  const schema = rawSchema as unknown as ChecklistSchema;
  const ptBr = {
    ...rawPtBr,
    ...rawPtBrGroups,
    ...rawPtBrQuestions,
  } as unknown as TranslationDictionary;
  const enUs = {
    ...rawEnUs,
    ...rawEnUsGroups,
    ...rawEnUsQuestions,
  } as unknown as TranslationDictionary;

  it('should validate checklist-v1.json conforms to ChecklistSchema structure and semver', () => {
    expect(typeof schema.schemaVersion).toBe('string');
    expect(schema.schemaVersion).toMatch(SEMVER_REGEX);
    expect(schema.schemaVersion).toBe('1.0.0');

    expect(Array.isArray(schema.participantRoles)).toBe(true);
    expect(schema.participantRoles).toEqual(ALL_PARTICIPANT_ROLES);

    expect(Array.isArray(schema.scales)).toBe(true);
    expect(schema.scales).toHaveLength(6);

    const scaleIds = schema.scales.map((scale) => scale.id);
    const scaleOrders = schema.scales.map((scale) => scale.order);

    expect(new Set(scaleIds).size).toBe(6);
    expect(scaleIds).toEqual(VALID_SCALE_IDS);
    expect(scaleOrders).toEqual([1, 2, 3, 4, 5, 6]);

    for (const scale of schema.scales) {
      expect(scale.color).toMatch(HEX_COLOR_REGEX);
      expect(scale.contrastColor).toMatch(HEX_COLOR_REGEX);
      expect(scale.icon).toMatch(ICON_CLASS_REGEX);
      expect(Object.keys(scale).sort()).toEqual(['color', 'contrastColor', 'icon', 'id', 'order']);
    }

    expect(Array.isArray(schema.groups)).toBe(true);
    expect(schema.groups).toHaveLength(8);

    const groupIds = schema.groups.map((group) => group.id);
    const groupOrders = schema.groups.map((group) => group.order);

    expect(new Set(groupIds).size).toBe(8);
    expect(groupOrders).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

    for (const group of schema.groups) {
      expect(group.id).toMatch(/^grp_[a-z0-9_]+$/);
      expect(typeof group.defaultDualRole).toBe('boolean');
      expect(VALID_ROLE_PAIR_IDS).toContain(group.rolePairId);
      expect(Array.isArray(group.participantRoles)).toBe(true);
      expect(group.participantRoles?.length ?? 0).toBeGreaterThan(0);
      expect(new Set(group.participantRoles).size).toBe(group.participantRoles?.length);
      for (const roleId of group.participantRoles ?? []) {
        expect(ALL_PARTICIPANT_ROLES).toContain(roleId);
      }
      expect(Array.isArray(group.items)).toBe(true);
      expect(group.items.length).toBeGreaterThan(0);

      // Verify schema contains no hardcoded human-readable text properties
      expect(Object.keys(group).sort()).toEqual([
        'defaultDualRole',
        'id',
        'items',
        'order',
        'participantRoles',
        'rolePairId',
      ]);
    }
  });

  it('should ensure every item has valid QuestionType, unique ID, groupId, participantRoles, and required properties', () => {
    const allowedItemKeys = new Set([
      'id',
      'groupId',
      'participantRoles',
      'type',
      'dualRole',
      'rolePairId',
      'scaleRef',
      'options',
      'allowOtherOption',
      'maxLength',
    ]);

    const seenItemIds = new Set<string>();
    const seenOptionIds = new Set<string>();
    const observedQuestionTypes = new Set<QuestionType>();

    for (const group of schema.groups) {
      for (const item of group.items) {
        expect(item.id).toMatch(/^item_[a-z0-9_]+$/);
        expect(seenItemIds.has(item.id)).toBe(false);
        seenItemIds.add(item.id);
        expect(item.groupId).toBe(group.id);
        expect(Array.isArray(item.participantRoles)).toBe(true);
        expect(item.participantRoles?.length ?? 0).toBeGreaterThan(0);
        expect(new Set(item.participantRoles).size).toBe(item.participantRoles?.length);
        for (const roleId of item.participantRoles ?? []) {
          expect(ALL_PARTICIPANT_ROLES).toContain(roleId as ParticipantRoleId);
        }

        expect(VALID_QUESTION_TYPES).toContain(item.type);
        observedQuestionTypes.add(item.type);

        for (const key of Object.keys(item)) {
          expect(allowedItemKeys.has(key)).toBe(true);
        }

        if (item.dualRole !== undefined) {
          expect(typeof item.dualRole).toBe('boolean');
        }

        if (item.rolePairId !== undefined) {
          expect(VALID_ROLE_PAIR_IDS).toContain(item.rolePairId);
        }

        if (item.allowOtherOption !== undefined) {
          expect(typeof item.allowOtherOption).toBe('boolean');
        }

        if (item.type === 'single_choice' || item.type === 'multiple_choice') {
          expect(Array.isArray(item.options)).toBe(true);
          expect(item.options?.length ?? 0).toBeGreaterThan(0);

          const itemOptionSet = new Set(item.options);
          expect(itemOptionSet.size).toBe(item.options?.length);

          for (const optionId of item.options ?? []) {
            expect(optionId).toMatch(/^opt_[a-z0-9_]+$/);
            expect(seenOptionIds.has(optionId)).toBe(false);
            seenOptionIds.add(optionId);
          }
        }

        if (item.type === 'restricted_text') {
          expect(typeof item.maxLength).toBe('number');
          expect(item.maxLength).toBeGreaterThan(0);
        }
      }
    }

    // All 4 question types must be exercised in checklist-v1.json
    for (const questionType of VALID_QUESTION_TYPES) {
      expect(observedQuestionTypes.has(questionType)).toBe(true);
    }

    const safetyGroup = schema.groups.find((g) => g.id === 'grp_safety_health');
    expect(safetyGroup).toBeDefined();
    expect(safetyGroup?.rolePairId).toBe('general');
    expect(safetyGroup?.defaultDualRole).toBe(false);
    expect(
      safetyGroup?.items.some(
        (item) => item.type === 'single_choice' && item.allowOtherOption === true,
      ),
    ).toBe(true);
    expect(
      safetyGroup?.items.some(
        (item) => item.type === 'multiple_choice' && item.allowOtherOption === true,
      ),
    ).toBe(true);
    expect(
      safetyGroup?.items.some((item) => item.type === 'restricted_text' && item.maxLength === 300),
    ).toBe(true);

    const bondageGroup = schema.groups.find((g) => g.id === 'grp_bondage_restraint');
    expect(
      bondageGroup?.items.some(
        (item) =>
          item.type === 'multiple_choice' &&
          item.dualRole === false &&
          item.allowOtherOption === true,
      ),
    ).toBe(true);

    const impactGroup = schema.groups.find((g) => g.id === 'grp_impact_play');
    expect(
      impactGroup?.items.some(
        (item) =>
          item.type === 'multiple_choice' &&
          item.dualRole === false &&
          item.allowOtherOption === true,
      ),
    ).toBe(true);
  });

  it('should guarantee 100% recursive key parity and non-empty strings between pt-BR.json and en-US.json, with groups in groups/ and items/options in questions/', () => {
    expect('groups' in rawPtBr).toBe(false);
    expect('groups' in rawEnUs).toBe(false);
    expect('items' in rawPtBr).toBe(false);
    expect('items' in rawEnUs).toBe(false);
    expect('options' in rawPtBr).toBe(false);
    expect('options' in rawEnUs).toBe(false);
    expect(Object.keys(rawPtBrGroups)).toEqual(['groups']);
    expect(Object.keys(rawEnUsGroups)).toEqual(['groups']);
    expect(Object.keys(rawPtBrQuestions)).toEqual(['items', 'options']);
    expect(Object.keys(rawEnUsQuestions)).toEqual(['items', 'options']);

    const ptStructure = collectKeyPaths(rawPtBr);
    const enStructure = collectKeyPaths(rawEnUs);
    const ptGroupsStructure = collectKeyPaths(rawPtBrGroups);
    const enGroupsStructure = collectKeyPaths(rawEnUsGroups);
    const ptQuestionsStructure = collectKeyPaths(rawPtBrQuestions);
    const enQuestionsStructure = collectKeyPaths(rawEnUsQuestions);

    expect(ptStructure.paths).toEqual(enStructure.paths);
    expect(ptStructure.emptyLeaves).toEqual([]);
    expect(enStructure.emptyLeaves).toEqual([]);

    expect(ptGroupsStructure.paths).toEqual(enGroupsStructure.paths);
    expect(ptGroupsStructure.emptyLeaves).toEqual([]);
    expect(enGroupsStructure.emptyLeaves).toEqual([]);

    expect(ptQuestionsStructure.paths).toEqual(enQuestionsStructure.paths);
    expect(ptQuestionsStructure.emptyLeaves).toEqual([]);
    expect(enQuestionsStructure.emptyLeaves).toEqual([]);

    for (const uiKey of REQUIRED_UI_KEYS) {
      expect(ptBr.ui[uiKey]?.trim().length ?? 0).toBeGreaterThan(0);
      expect(enUs.ui[uiKey]?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });

  it('should verify every scale, rolePairId, group, item, and option ID in checklist-v1.json exists in both pt-BR.json and en-US.json', () => {
    const dictionaries: readonly { readonly lang: string; readonly dict: TranslationDictionary }[] =
      [
        { lang: 'pt-BR', dict: ptBr },
        { lang: 'en-US', dict: enUs },
      ];

    for (const { dict } of dictionaries) {
      for (const scale of schema.scales) {
        expect(dict.scales[scale.id]?.trim().length ?? 0).toBeGreaterThan(0);
      }

      for (const participantRoleId of ALL_PARTICIPANT_ROLES) {
        expect(dict.participantRoles[participantRoleId]?.trim().length ?? 0).toBeGreaterThan(0);
      }

      for (const rolePairId of VALID_ROLE_PAIR_IDS) {
        const roleEntry = dict.roles[rolePairId];
        expect(roleEntry).toBeDefined();
        expect(roleEntry?.primary.trim().length ?? 0).toBeGreaterThan(0);

        if (DUAL_ROLE_PAIR_IDS.includes(rolePairId)) {
          expect(roleEntry?.secondary?.trim().length ?? 0).toBeGreaterThan(0);
        }
      }

      for (const group of schema.groups) {
        const groupEntry = dict.groups[group.id];
        expect(groupEntry).toBeDefined();
        expect(groupEntry?.title.trim().length ?? 0).toBeGreaterThan(0);
        expect(groupEntry?.description.trim().length ?? 0).toBeGreaterThan(0);

        for (const item of group.items) {
          const itemEntry = dict.items[item.id];
          expect(itemEntry).toBeDefined();
          expect(itemEntry?.label.trim().length ?? 0).toBeGreaterThan(0);
          expect(itemEntry?.tooltip.trim().length ?? 0).toBeGreaterThan(0);

          if (group.id === 'grp_breath_edge') {
            expect(itemEntry?.tooltip).toContain('RACK');
          }

          for (const optionId of item.options ?? []) {
            expect(dict.options[optionId]?.trim().length ?? 0).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});
