import {
  ChecklistSchema,
  ChoiceOptionDefinition,
  ItemDefinition,
  ScaleOption,
} from './checklist-schema.model';
import {
  collectValidScaleValues,
  getScaleAnswerValue,
  normalizeChoiceOption,
  resolveChoiceOptionLabel,
  resolveItemScales,
  resolveOrderedChoiceOptions,
  resolveOrderedScales,
  resolveScaleLabel,
} from './checklist-options.helpers';

const BASE_SCALES: readonly ScaleOption[] = [
  {
    id: 'enjoy',
    value: '5',
    order: 2,
    label: 'Gosto',
    color: '#388E3C',
    contrastColor: '#FFFFFF',
    icon: 'fa-solid fa-check',
  },
  {
    id: 'hard_limit',
    value: '1',
    order: 1,
    label: 'Não',
    color: '#D32F2F',
    contrastColor: '#FFFFFF',
    icon: 'fa-solid fa-ban',
  },
];

describe('Checklist Options Helpers', () => {
  // Cenário: Ordenação e normalização de opções estruturadas vs. strings legadas.
  // Objetivo: Garantir que ChoiceOptionDefinition seja ordenado por 'order' preservando 'value' e 'label', sem quebrar listas string[].
  it('should normalize string and structured choice options, sort by order, and resolve labels', () => {
    const unordered: readonly (string | ChoiceOptionDefinition)[] = [
      { id: 'opt_b', value: 'val_b', order: 3, label: 'Inline B' },
      'opt_legacy',
      { id: 'opt_a', value: 'val_a', order: 1, label: 'Inline A' },
    ];

    const resolved = resolveOrderedChoiceOptions(unordered);
    expect(resolved.map((o) => [o.id, o.value, o.order])).toEqual([
      ['opt_a', 'val_a', 1],
      ['opt_legacy', 'opt_legacy', 2],
      ['opt_b', 'val_b', 3],
    ]);

    expect(resolveChoiceOptionLabel(resolved[0], { opt_a: 'Translated A' })).toBe('Translated A');
    expect(resolveChoiceOptionLabel(resolved[0], {})).toBe('Inline A');
    expect(resolveChoiceOptionLabel(normalizeChoiceOption('opt_plain', 1), {})).toBe('opt_plain');
    expect(resolveOrderedChoiceOptions(undefined)).toEqual([]);
  });

  // Cenário: Escalas dinâmicas por item, por scaleSets[scaleRef] e padrão do schema.
  // Objetivo: Garantir ordem numérica crescente, resolução de 'value' numérico/string e prioridade item > scaleRef > default.
  it('should resolve scales dynamically by priority (item > scaleRef > default) and sort by order', () => {
    const customItemScales: readonly ScaleOption[] = [
      {
        id: 'yes',
        value: 'yes_val',
        order: 2,
        label: 'Sim',
        color: '#388E3C',
        contrastColor: '#FFFFFF',
        icon: 'fa-solid fa-check',
      },
      {
        id: 'no',
        value: 'no_val',
        order: 1,
        label: 'Não',
        color: '#D32F2F',
        contrastColor: '#FFFFFF',
        icon: 'fa-solid fa-ban',
      },
    ];
    const scaleSetBinary: readonly ScaleOption[] = [
      {
        id: 'agree',
        value: 10,
        order: 1,
        label: 'Concordo',
        color: '#16A34A',
        contrastColor: '#FFFFFF',
        icon: 'fa-solid fa-check',
      },
    ];

    const itemWithOwnScales: ItemDefinition = {
      id: 'q1',
      type: 'scale_matrix',
      scales: customItemScales,
    };
    const itemWithRef: ItemDefinition = { id: 'q2', type: 'scale_matrix', scaleRef: 'binary' };
    const defaultItem: ItemDefinition = { id: 'q3', type: 'scale_matrix' };

    expect(
      resolveItemScales(BASE_SCALES, itemWithOwnScales, { binary: scaleSetBinary }).map((s) =>
        getScaleAnswerValue(s),
      ),
    ).toEqual(['no_val', 'yes_val']);
    expect(
      resolveItemScales(BASE_SCALES, itemWithRef, { binary: scaleSetBinary }).map((s) =>
        getScaleAnswerValue(s),
      ),
    ).toEqual(['10']);
    expect(
      resolveItemScales(BASE_SCALES, defaultItem, { binary: scaleSetBinary }).map((s) => s.id),
    ).toEqual(['hard_limit', 'enjoy']);
    expect(resolveOrderedScales(BASE_SCALES).map((s) => s.id)).toEqual(['hard_limit', 'enjoy']);
    expect(resolveScaleLabel(BASE_SCALES[0], {})).toBe('Gosto');
    expect(resolveScaleLabel(BASE_SCALES[0], { enjoy: 'Apreciado' })).toBe('Apreciado');
  });

  // Cenário: Coleta de valores de escala aceitos dinamicamente a partir do schema ativo.
  // Objetivo: Incluir ids e values de schema.scales, scaleSets e item.scales (com fallback built-in quando null).
  it('should collect all valid scale IDs and values dynamically across schema, scaleSets, and items', () => {
    expect(collectValidScaleValues(null).has('not_applicable')).toBe(true);

    const dynamicSchema: ChecklistSchema = {
      schemaVersion: '1.0.0',
      scales: BASE_SCALES,
      scaleSets: {
        custom_set: [
          {
            id: 'custom_scale',
            value: '99',
            order: 1,
            color: '#000000',
            contrastColor: '#FFFFFF',
            icon: 'fa-solid fa-star',
          },
        ],
      },
      groups: [
        {
          id: 'g1',
          order: 1,
          defaultDualRole: false,
          rolePairId: 'general',
          items: [
            {
              id: 'q1',
              type: 'scale_matrix',
              scales: [
                {
                  id: 'item_only',
                  value: 'item_val',
                  order: 1,
                  color: '#111111',
                  contrastColor: '#FFFFFF',
                  icon: 'fa-solid fa-check',
                },
              ],
            },
          ],
        },
      ],
    };

    const valid = collectValidScaleValues(dynamicSchema);
    expect(valid.has('1')).toBe(true);
    expect(valid.has('5')).toBe(true);
    expect(valid.has('99')).toBe(true);
    expect(valid.has('custom_scale')).toBe(true);
    expect(valid.has('item_val')).toBe(true);
    expect(valid.has('item_only')).toBe(true);
    expect(valid.has('unlisted_value')).toBe(false);
  });
});
