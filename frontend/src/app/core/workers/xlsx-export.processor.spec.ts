import { ChecklistSchema, FlattenedChecklistRow, ResolvedPreviewTexts } from '../models';
import { buildStyledXlsxWorkbook, XlsxExportLabels } from './xlsx-export.processor';

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
      items: [{ id: 'item_rope', type: 'scale_matrix' }],
    },
  ],
};

const MOCK_TEXTS: ResolvedPreviewTexts = {
  title: 'Kink Consent Report',
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
  },
  items: {
    item_sw: { label: 'Safeword & Care' },
    item_rope: { label: 'Rope <Heavy> & "Cuffs"' },
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

describe('xlsx-export.processor', () => {
  // Cenário: Geração de arquivo XLSX no layout Moderno.
  // Objetivo: Garantir cabeçalho ZIP PK válido, presença de todos os arquivos OOXML obrigatórios, estilos slate/cores das escalas e escape XML seguro.
  it('should build a valid OOXML .xlsx archive with modern slate styling and escaped XML content', () => {
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
    expect(bytes[2]).toBe(0x03);
    expect(bytes[3]).toBe(0x04);
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
    expect(stylesXml).toContain('FF0F172A');
    expect(stylesXml).toContain('FF388E3C');
    expect(stylesXml).toContain('FF111827');

    const sheetXml = entries.get('xl/worksheets/sheet1.xml')!;
    expect(sheetXml).toContain('Kink Consent Report');
    expect(sheetXml).toContain('Essential agreements');
    expect(sheetXml).toContain('Safeword &amp; Care');
    expect(sheetXml).toContain('Rope &lt;Heavy&gt; &amp; &quot;Cuffs&quot;');
    expect(sheetXml).toContain('Red stops now');
    expect(sheetXml).not.toContain('● Enjoy');
  });

  // Cenário: Geração de arquivo XLSX seguindo o layout Clássico.
  // Objetivo: Garantir aplicação da paleta carmesim clássica, títulos em caixa alta, omissão de descrições longas e marcadores ● / ○ nas células.
  it('should apply classic crimson layout styling, uppercase banners, and dot markers when layout is classic', () => {
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
    expect(stylesXml).toContain('FF991B1B');
    expect(stylesXml).toContain('FFDC2626');
    expect(stylesXml).toContain('FFFEE2E2');

    const sheetXml = entries.get('xl/worksheets/sheet1.xml')!;
    expect(sheetXml).toContain('KINK CONSENT REPORT');
    expect(sheetXml).toContain('SAFETY &amp; PROTOCOLS');
    expect(sheetXml).toContain('BONDAGE');
    expect(sheetXml).toContain('● Enjoy');
    expect(sheetXml).toContain('○ Not answered');
    expect(sheetXml).not.toContain('Essential agreements');
  });
});
