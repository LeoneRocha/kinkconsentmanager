import { ChecklistSchema, FlattenedChecklistRow, ResolvedPreviewTexts } from '../models';
import { buildCsvContentFromRows, processCsvExportPayload } from './csv-export.processor';

const MOCK_SCHEMA: ChecklistSchema = {
  schemaVersion: '1.0.0',
  scales: [
    {
      id: 'not_applicable',
      order: 1,
      color: '#546E7A',
      contrastColor: '#FFFFFF',
      icon: 'fa-solid fa-circle-minus',
    },
    { id: 'hard_limit', order: 2, color: '#D32F2F', contrastColor: '#FFFFFF', icon: 'pi pi-ban' },
    { id: 'enjoy', order: 3, color: '#388E3C', contrastColor: '#FFFFFF', icon: 'pi pi-check' },
  ],
  groups: [
    {
      id: 'grp_safety',
      order: 1,
      defaultDualRole: false,
      rolePairId: 'general',
      items: [{ id: 'item_sw', type: 'single_choice', options: ['opt_traffic'] }],
    },
    {
      id: 'grp_bondage',
      order: 2,
      defaultDualRole: true,
      rolePairId: 'giving_receiving',
      items: [
        { id: 'item_rope', type: 'scale_matrix' },
        { id: 'item_collar', type: 'scale_matrix', rolePairId: 'dominant_submissive' },
      ],
    },
  ],
};

const MOCK_TEXTS: ResolvedPreviewTexts = {
  title: 'Checklist Report',
  schemaVersionLabel: 'Schema Version',
  generatedAtLabel: 'Generated at',
  generatedAtValue: '2026-11-25 13:00',
  notAnsweredLabel: 'Not answered',
  otherLabel: 'Other',
  scales: {
    not_applicable: 'Not applicable',
    hard_limit: 'Hard Limit',
    enjoy: 'Enjoy',
  },
  roles: {
    giving_receiving: { primary: 'Giving', secondary: 'Receiving' },
    dominant_submissive: { primary: 'Dominant', secondary: 'Submissive' },
    general: { primary: 'General' },
  },
  groups: {
    grp_safety: { title: 'Safety, Health & Care', description: 'Essential protocols' },
    grp_bondage: { title: 'Bondage' },
  },
  items: {
    item_sw: { label: 'Safeword "Traffic Light"' },
    item_rope: { label: 'Rope Bondage' },
    item_collar: { label: 'Collar Protocol' },
  },
  options: {},
};

const MOCK_ROWS: readonly FlattenedChecklistRow[] = [
  {
    groupId: 'grp_safety',
    groupTitle: 'Safety, Health & Care',
    itemId: 'item_sw',
    itemLabel: 'Safeword "Traffic Light"',
    isDualRole: false,
    primaryRoleLabel: 'General',
    primaryValueLabel: 'Traffic Light',
    selectedOptionsLabels: ['Traffic Light'],
    customNote: 'Line 1\nLine 2',
  },
  {
    groupId: 'grp_bondage',
    groupTitle: 'Bondage',
    itemId: 'item_rope',
    itemLabel: 'Rope Bondage',
    isDualRole: true,
    primaryRoleLabel: 'Giving',
    secondaryRoleLabel: 'Receiving',
    primaryValueLabel: 'Enjoy',
    secondaryValueLabel: 'Not applicable',
    primaryColor: '#388E3C',
    secondaryColor: '#546E7A',
    selectedOptionsLabels: [],
    customNote: '',
  },
  {
    groupId: 'grp_bondage',
    groupTitle: 'Bondage',
    itemId: 'item_collar',
    itemLabel: 'Collar Protocol',
    isDualRole: true,
    primaryRoleLabel: 'Dominant',
    secondaryRoleLabel: 'Submissive',
    primaryValueLabel: 'Hard Limit',
    secondaryValueLabel: 'Enjoy',
    primaryColor: '#D32F2F',
    secondaryColor: '#388E3C',
    selectedOptionsLabels: [],
    customNote: '',
  },
];

describe('csv-export.processor', () => {
  // Cenário: Serialização CSV RFC-4180 espelhando o layout tabular do Excel (título, metadados, legenda em 3 colunas e categorias localizadas).
  // Objetivo: Garantir BOM UTF-8, escape de aspas/vírgulas/quebras de linha, cabeçalhos legíveis sem IDs internos e prefixo de papel quando sobrescrito no item.
  it('should generate Excel-aligned UTF-8 BOM CSV with legend, localized headers, role hints, and RFC-4180 escaping', () => {
    const csv = buildCsvContentFromRows(MOCK_ROWS, {
      schema: MOCK_SCHEMA,
      texts: MOCK_TEXTS,
      layout: 'modern',
      labels: {
        itemHeader: 'Practice / Item',
        valueHeader: 'Response',
        legendTitle: 'Scale Legend',
        layoutLabel: 'Modern View',
      },
    });

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).not.toContain('Group_ID');
    expect(csv).not.toContain('Item_ID');
    expect(csv).not.toContain('Role_Mode');

    const expected = [
      'Checklist Report',
      'Generated at: 2026-11-25 13:00  •  Modern View',
      '',
      'Scale Legend',
      'Not applicable,Hard Limit,Enjoy',
      'Not answered,,',
      '',
      '"Safety, Health & Care"',
      'Essential protocols',
      'Practice / Item,Response',
      '"Safeword ""Traffic Light""","Traffic Light\nLine 1\nLine 2"',
      '',
      'Bondage',
      'Practice / Item,Giving,Receiving',
      'Rope Bondage,Enjoy,Not applicable',
      'Collar Protocol,Dominant: Hard Limit,Submissive: Enjoy',
    ].join('\r\n');

    expect(csv.slice(1)).toBe(expected);
  });

  // Cenário: Serialização CSV sem contexto rico de schema/texts e execução via payload de worker.
  // Objetivo: Confirmar agrupamento com cabeçalhos padrão em fallback e emissão ordenada dos estágios de progresso.
  it('should fall back cleanly without context and emit progress milestones on processCsvExportPayload', () => {
    const milestones: [string, number][] = [];
    const output = processCsvExportPayload(
      { task: 'export_csv', requestId: 'csv-1', rows: MOCK_ROWS },
      (stage, pct) => milestones.push([stage, pct]),
    );

    expect(milestones).toEqual([
      ['preparing', 30],
      ['building', 70],
      ['complete', 100],
    ]);
    expect(output.startsWith('\uFEFF')).toBe(true);
    expect(output).toContain('"Safety, Health & Care"');
    expect(output).toContain('Prática / Item,Giving,Receiving');
    expect(output).toContain('Rope Bondage,Enjoy,Not applicable');
  });
});
