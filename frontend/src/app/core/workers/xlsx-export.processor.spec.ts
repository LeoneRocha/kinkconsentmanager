import { ChecklistSchema, FlattenedChecklistRow, ResolvedPreviewTexts } from '../models';
import {
  buildStyledXlsxWorkbook,
  processXlsxExportPayload,
  XlsxExportLabels,
} from './xlsx-export.processor';

const MOCK_SCHEMA: ChecklistSchema = {
  schemaVersion: '1.0.0',
  scales: [
    { id: 'hard_limit', order: 1, color: '#D32F2F', contrastColor: '#FFFFFF', icon: 'pi pi-ban' },
    {
      id: 'curious',
      order: 2,
      color: '#FBC02D',
      contrastColor: '#111827',
      icon: 'pi pi-question-circle',
    },
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
        { id: 'item_self', type: 'scale_matrix', dualRole: false, rolePairId: 'general' },
      ],
    },
    {
      id: 'grp_impact',
      order: 3,
      defaultDualRole: true,
      rolePairId: 'giving_receiving',
      items: [{ id: 'item_spank', type: 'scale_matrix' }],
    },
  ],
};

const MOCK_TEXTS: ResolvedPreviewTexts = {
  title: 'Checklist',
  schemaVersionLabel: 'Schema Version',
  generatedAtLabel: 'Generated at',
  generatedAtValue: '2026-11-24 21:00',
  notAnsweredLabel: 'Not answered',
  otherLabel: 'Other',
  scales: {
    hard_limit: 'Hard Limit',
    curious: 'Curious',
    enjoy: 'Enjoy',
  },
  roles: {
    giving_receiving: { primary: 'Giving', secondary: 'Receiving' },
    general: { primary: 'General' },
  },
  groups: {
    grp_safety: { title: 'Safety & Protocols', description: 'Essential agreements' },
    grp_bondage: { title: 'Bondage' },
    grp_impact: { title: 'Impact Play' },
  },
  items: {
    item_sw: { label: 'Safeword & Care' },
    item_rope: { label: 'Rope <Heavy> & "Cuffs"' },
    item_self: { label: 'Self-tying' },
    item_spank: { label: 'Spanking' },
  },
  options: {
    opt_traffic: 'Traffic Light',
  },
};

const MOCK_ROWS: readonly FlattenedChecklistRow[] = [
  {
    groupId: 'grp_safety',
    groupTitle: 'Safety & Protocols',
    itemId: 'item_sw',
    itemLabel: 'Safeword & Care',
    isDualRole: false,
    primaryRoleLabel: 'General',
    primaryValueLabel: 'Traffic Light',
    selectedOptionsLabels: ['Traffic Light'],
    customNote: 'Red stops now',
  },
  {
    groupId: 'grp_bondage',
    groupTitle: 'Bondage',
    itemId: 'item_rope',
    itemLabel: 'Rope <Heavy> & "Cuffs"',
    isDualRole: true,
    primaryRoleLabel: 'Giving',
    secondaryRoleLabel: 'Receiving',
    primaryValueLabel: 'Enjoy',
    secondaryValueLabel: 'Not answered',
    primaryColor: '#388E3C',
    selectedOptionsLabels: [],
    customNote: '',
  },
  {
    groupId: 'grp_bondage',
    groupTitle: 'Bondage',
    itemId: 'item_self',
    itemLabel: 'Self-tying',
    isDualRole: false,
    primaryRoleLabel: 'General',
    primaryValueLabel: 'Not answered',
    selectedOptionsLabels: [],
    customNote: '',
  },
  {
    groupId: 'grp_impact',
    groupTitle: 'Impact Play',
    itemId: 'item_spank',
    itemLabel: 'Spanking',
    isDualRole: true,
    primaryRoleLabel: 'Giving',
    secondaryRoleLabel: 'Receiving',
    primaryValueLabel: 'Hard Limit',
    secondaryValueLabel: 'Curious',
    primaryColor: '#D32F2F',
    secondaryColor: '#FBC02D',
    selectedOptionsLabels: [],
    customNote: '',
  },
];

const MOCK_LABELS: XlsxExportLabels = {
  itemHeader: 'Practice',
  valueHeader: 'Response',
  legendTitle: 'Scale Legend',
  layoutLabel: 'Modern View',
};

function readZipEntries(archive: Uint8Array): Map<string, string> {
  const entries = new Map<string, string>();
  const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  const decoder = new TextDecoder('utf-8');
  let offset = 0;

  while (offset + 30 <= archive.length) {
    const signature = view.getUint32(offset, true);
    if (signature !== 0x04034b50) {
      break;
    }
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLen + extraLen;
    const filename = decoder.decode(archive.subarray(nameStart, nameStart + nameLen));
    const xml = decoder.decode(archive.subarray(dataStart, dataStart + compressedSize));
    entries.set(filename, xml);
    offset = dataStart + compressedSize;
  }

  return entries;
}

function colLettersToIndex(letters: string): number {
  let num = 0;
  for (let i = 0; i < letters.length; i += 1) {
    num = num * 26 + (letters.charCodeAt(i) - 64);
  }
  return num;
}

function assertStrictlySortedRowsAndCells(sheetXml: string): void {
  const rowMatches = [...sheetXml.matchAll(/<row r="(\d+)"[^>]*>(.*?)<\/row>/g)];
  let prevRow = 0;
  for (const rowMatch of rowMatches) {
    const rowIdx = Number(rowMatch[1]);
    expect(rowIdx).toBeGreaterThan(prevRow);
    prevRow = rowIdx;

    const cellMatches = [...rowMatch[2].matchAll(/<c r="([A-Z]+)(\d+)"/g)];
    let prevCol = 0;
    for (const cellMatch of cellMatches) {
      const colIdx = colLettersToIndex(cellMatch[1]);
      expect(Number(cellMatch[2])).toBe(rowIdx);
      expect(colIdx).toBeGreaterThan(prevCol);
      prevCol = colIdx;
    }
  }
}

describe('xlsx-export.processor', () => {
  // Cenário: Geração de arquivo XLSX no layout Moderno com cores claras e fontes pretas.
  // Objetivo: Garantir ausência de fundos escuros em títulos/categorias, preenchimento pastel suave nas escalas, texto preto em negrito e escape XML seguro.
  it('should build a light-themed OOXML .xlsx archive with black fonts, no header fills, and pastel scale tints', () => {
    const stages: string[] = [];
    const bytes = buildStyledXlsxWorkbook(
      {
        schema: MOCK_SCHEMA,
        rows: MOCK_ROWS,
        texts: MOCK_TEXTS,
        layout: 'modern',
        labels: MOCK_LABELS,
      },
      (stage) => stages.push(stage),
    );

    expect(bytes[0]).toBe(0x50); // P
    expect(bytes[1]).toBe(0x4b); // K
    expect(stages).toEqual(['preparing', 'building', 'packaging', 'complete']);

    const entries = readZipEntries(bytes);
    expect(Array.from(entries.keys())).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/worksheets/sheet1.xml',
    ]);

    const stylesXml = entries.get('xl/styles.xml')!;
    // Sem preenchimentos escuros pesados
    expect(stylesXml).not.toContain('FF0F172A');
    expect(stylesXml).not.toContain('FF991B1B');
    expect(stylesXml).not.toContain('FFDC2626');
    // Texto em preto (#111827) e preenchimentos pastéis suaves (ex.: #388E3C clareado -> FFD7E8D8)
    expect(stylesXml).toContain('FF111827');
    expect(stylesXml).toContain('FFD7E8D8');
    expect(stylesXml).toContain('FFF6D5D5');

    const sheetXml = entries.get('xl/worksheets/sheet1.xml')!;
    assertStrictlySortedRowsAndCells(sheetXml);
    expect(sheetXml).toContain('Checklist');
    expect(sheetXml).toContain('Essential agreements');
    expect(sheetXml).toContain('Safeword &amp; Care');
    expect(sheetXml).toContain('Rope &lt;Heavy&gt; &amp; &quot;Cuffs&quot;');
    expect(sheetXml).toContain('Red stops now');
  });

  // Cenário: Geração de arquivo XLSX no layout Clássico minimalista de 3 colunas espelhando a tela.
  // Objetivo: Garantir zero cores de fundo, títulos em negrito preto (sem caixa alta forçada), 3 colunas lado a lado em paisagem, legenda em rich-text e bolinhas ●/○ coloridas.
  it('should render classic layout as a clean 3-column sheet with black headings, zero background fills, and colored dot markers', () => {
    const bytes = buildStyledXlsxWorkbook({
      schema: MOCK_SCHEMA,
      rows: MOCK_ROWS,
      texts: MOCK_TEXTS,
      layout: 'classic',
      labels: {
        ...MOCK_LABELS,
        layoutLabel: 'Classic View',
      },
    });

    const entries = readZipEntries(bytes);
    const stylesXml = entries.get('xl/styles.xml')!;
    expect(stylesXml).toContain('<fills count="2">');
    expect(stylesXml).not.toContain('patternType="solid"');
    expect(stylesXml).not.toContain('FF991B1B');
    expect(stylesXml).not.toContain('FFDC2626');

    const sheetXml = entries.get('xl/worksheets/sheet1.xml')!;
    assertStrictlySortedRowsAndCells(sheetXml);
    expect(sheetXml).toContain('orientation="landscape"');
    expect(sheetXml).toContain('A1:K1');
    expect(sheetXml).toContain('Safety &amp; Protocols');
    expect(sheetXml).toContain('Bondage');
    expect(sheetXml).toContain('Impact Play');
    expect(sheetXml).toContain('Giving, Receiving');
    expect(sheetXml).toContain('●');
    expect(sheetXml).toContain('○');
    expect(sheetXml).not.toContain('Essential agreements');
  });

  // Cenário: Despacho direto via payload de worker (`processXlsxExportPayload`).
  // Objetivo: Confirmar delegação limpa do payload de requisição e geração de arquivo XLSX válido com progresso.
  it('should generate valid XLSX archive via processXlsxExportPayload worker handler', () => {
    const stages: string[] = [];
    const bytes = processXlsxExportPayload(
      {
        task: 'export_xlsx',
        requestId: 'xlsx-worker-1',
        schema: MOCK_SCHEMA,
        rows: MOCK_ROWS,
        texts: MOCK_TEXTS,
        layout: 'modern',
        labels: MOCK_LABELS,
      },
      (stage) => stages.push(stage),
    );

    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    expect(stages).toEqual(['preparing', 'building', 'packaging', 'complete']);
  });
});
