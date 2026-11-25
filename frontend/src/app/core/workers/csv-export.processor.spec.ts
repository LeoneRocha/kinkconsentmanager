import { FlattenedChecklistRow } from '../models';
import { buildCsvContentFromRows, processCsvExportPayload } from './csv-export.processor';

const MOCK_ROWS: readonly FlattenedChecklistRow[] = [
  {
    groupId: 'grp_safety',
    groupTitle: 'Safety, Health & Care',
    itemId: 'item_sw',
    itemLabel: 'Safeword "Traffic Light"',
    isDualRole: false,
    primaryRoleLabel: 'General',
    primaryValueLabel: 'Enjoy',
    selectedOptionsLabels: ['Red', 'Yellow'],
    customNote: 'Line 1\nLine 2',
  },
];

describe('csv-export.processor', () => {
  // Cenário: Serialização CSV RFC-4180 com escape de aspas, vírgulas e quebras de linha.
  // Objetivo: Garantir cabeçalho UTF-8 BOM, campos escapados corretamente e integridade das colunas.
  it('should generate UTF-8 BOM CSV with proper RFC-4180 cell escaping', () => {
    const csv = buildCsvContentFromRows(MOCK_ROWS);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Group_ID,Category,Item_ID,Item_Label');
    expect(csv).toContain('"Safety, Health & Care"');
    expect(csv).toContain('"Safeword ""Traffic Light"""');
    expect(csv).toContain('"Line 1\nLine 2"');
  });

  // Cenário: Execução do processador dedicado de CSV via payload de worker.
  // Objetivo: Confirmar emissão ordenada dos estágios de progresso (preparing -> building -> complete) e conteúdo retornado.
  it('should emit progress milestones and return CSV string on processCsvExportPayload', () => {
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
    expect(output).toContain('item_sw');
  });
});
