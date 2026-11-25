import type { Content, ContentColumns } from 'pdfmake/interfaces';
import { ChecklistSchema, FlattenedChecklistRow, ResolvedPreviewTexts } from '../models';
import {
  buildClassicPdfDocumentDefinition,
  CLASSIC_PDF_LAYOUT_CONTRACT,
} from './pdf-classic-layout.builder';
import { buildPdfDocumentDefinition } from './pdf-document.builder';

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
    { id: 'hard_limit', order: 2, color: '#D32F2F', contrastColor: '#FFFFFF', icon: 'fa-solid fa-ban' },
    {
      id: 'soft_limit',
      order: 3,
      color: '#F57C00',
      contrastColor: '#111827',
      icon: 'fa-solid fa-triangle-exclamation',
    },
    {
      id: 'curious',
      order: 4,
      color: '#FBC02D',
      contrastColor: '#111827',
      icon: 'fa-solid fa-circle-question',
    },
    { id: 'enjoy', order: 5, color: '#388E3C', contrastColor: '#FFFFFF', icon: 'fa-solid fa-circle-check' },
    { id: 'favorite', order: 6, color: '#7B1FA2', contrastColor: '#FFFFFF', icon: 'fa-solid fa-heart' },
  ],
  groups: [
    {
      id: 'grp_safety',
      order: 1,
      defaultDualRole: false,
      rolePairId: 'general',
      items: [
        { id: 'item_sw', type: 'single_choice', options: ['opt_traffic'] },
        { id: 'item_notes', type: 'restricted_text', maxLength: 300 },
      ],
    },
    {
      id: 'grp_bondage',
      order: 2,
      defaultDualRole: true,
      rolePairId: 'giving_receiving',
      items: [
        { id: 'item_rope', type: 'scale_matrix' },
        { id: 'item_cuffs', type: 'scale_matrix' },
      ],
    },
    {
      id: 'grp_impact',
      order: 3,
      defaultDualRole: true,
      rolePairId: 'giving_receiving',
      items: [{ id: 'item_spanking', type: 'scale_matrix' }],
    },
    {
      id: 'grp_sensation',
      order: 4,
      defaultDualRole: true,
      rolePairId: 'giving_receiving',
      items: [{ id: 'item_wax', type: 'scale_matrix' }],
    },
  ],
};

const MOCK_TEXTS: ResolvedPreviewTexts = {
  title: 'Checklist',
  schemaVersionLabel: 'Schema Version',
  generatedAtLabel: 'Gerado em',
  generatedAtValue: '25/11/2026, 14:31',
  notAnsweredLabel: 'Não respondido',
  otherLabel: 'Outro',
  scales: {
    not_applicable: 'Não se aplica',
    hard_limit: 'Limite Rígido (Não)',
    soft_limit: 'Limite Flexível (Ressalvas)',
    curious: 'Curiosidade / Talvez',
    enjoy: 'Gosto / Apreciado',
    favorite: 'Favorito',
  },
  roles: {
    giving_receiving: { primary: 'Dar', secondary: 'Receber' },
    general: { primary: 'Geral' },
  },
  groups: {
    grp_safety: { title: 'Segurança, Saúde e Aftercare', description: 'Protocolos essenciais' },
    grp_bondage: { title: 'Bondage e Contenção' },
    grp_impact: { title: 'Impact Play' },
    grp_sensation: { title: 'Sensação' },
  },
  items: {
    item_sw: { label: 'Safeword' },
    item_notes: { label: 'Alergias' },
    item_rope: { label: 'Algemas e contenção leve' },
    item_cuffs: { label: 'Cordas / Rope Bondage' },
    item_spanking: { label: 'Spanking' },
    item_wax: { label: 'Cera quente' },
  },
  options: {
    opt_traffic: 'Semáforo',
  },
};

const MOCK_ROWS: readonly FlattenedChecklistRow[] = [
  {
    groupId: 'grp_safety',
    groupTitle: 'Segurança, Saúde e Aftercare',
    itemId: 'item_sw',
    itemLabel: 'Safeword',
    isDualRole: false,
    primaryRoleLabel: 'Geral',
    primaryValueLabel: 'Semáforo',
    selectedOptionsLabels: ['Semáforo'],
    customNote: '',
  },
  {
    groupId: 'grp_safety',
    groupTitle: 'Segurança, Saúde e Aftercare',
    itemId: 'item_notes',
    itemLabel: 'Alergias',
    isDualRole: false,
    primaryRoleLabel: 'Geral',
    primaryValueLabel: 'Látex',
    selectedOptionsLabels: [],
    customNote: 'Látex',
  },
  {
    groupId: 'grp_bondage',
    groupTitle: 'Bondage e Contenção',
    itemId: 'item_rope',
    itemLabel: 'Algemas e contenção leve',
    isDualRole: true,
    primaryRoleLabel: 'Dar',
    secondaryRoleLabel: 'Receber',
    primaryValueLabel: 'Limite Flexível (Ressalvas)',
    secondaryValueLabel: 'Limite Flexível (Ressalvas)',
    primaryColor: '#F57C00',
    secondaryColor: '#F57C00',
    selectedOptionsLabels: [],
    customNote: '',
  },
  {
    groupId: 'grp_bondage',
    groupTitle: 'Bondage e Contenção',
    itemId: 'item_cuffs',
    itemLabel: 'Cordas / Rope Bondage',
    isDualRole: true,
    primaryRoleLabel: 'Dar',
    secondaryRoleLabel: 'Receber',
    primaryValueLabel: 'Não respondido',
    secondaryValueLabel: 'Gosto / Apreciado',
    secondaryColor: '#388E3C',
    selectedOptionsLabels: [],
    customNote: '',
  },
  {
    groupId: 'grp_impact',
    groupTitle: 'Impact Play',
    itemId: 'item_spanking',
    itemLabel: 'Spanking',
    isDualRole: true,
    primaryRoleLabel: 'Dar',
    secondaryRoleLabel: 'Receber',
    primaryValueLabel: 'Favorito',
    secondaryValueLabel: 'Não respondido',
    primaryColor: '#7B1FA2',
    selectedOptionsLabels: [],
    customNote: '',
  },
  {
    groupId: 'grp_sensation',
    groupTitle: 'Sensação',
    itemId: 'item_wax',
    itemLabel: 'Cera quente',
    isDualRole: true,
    primaryRoleLabel: 'Dar',
    secondaryRoleLabel: 'Receber',
    primaryValueLabel: 'Curiosidade / Talvez',
    secondaryValueLabel: 'Curiosidade / Talvez',
    primaryColor: '#FBC02D',
    secondaryColor: '#FBC02D',
    selectedOptionsLabels: [],
    customNote: '',
  },
];

function asColumns(node: Content): ContentColumns | null {
  if (typeof node === 'object' && node !== null && 'columns' in node) {
    return node as ContentColumns;
  }
  return null;
}

describe('pdf-classic-layout.builder (PNG Classic contract)', () => {
  // Cenário: Contrato visual Classic PDF espelhando o PNG Classic (folha em colunas com bolinhas).
  // Objetivo: Travar orientação, densidade de colunas e marcadores; mudanças exigem aprovação explícita.
  it('should lock the Classic PDF page geometry to landscape A4 with 4 balanced columns', () => {
    const docDef = buildClassicPdfDocumentDefinition(MOCK_SCHEMA, MOCK_ROWS, MOCK_TEXTS);

    expect(CLASSIC_PDF_LAYOUT_CONTRACT.pageOrientation).toBe('landscape');
    expect(CLASSIC_PDF_LAYOUT_CONTRACT.columnCount).toBe(4);
    expect(docDef.pageSize).toBe(CLASSIC_PDF_LAYOUT_CONTRACT.pageSize);
    expect(docDef.pageOrientation).toBe(CLASSIC_PDF_LAYOUT_CONTRACT.pageOrientation);

    const content = docDef.content as Content[];
    const bodyColumns = asColumns(content[content.length - 1]);
    expect(bodyColumns).not.toBeNull();
    expect(Array.isArray(bodyColumns?.columns)).toBe(true);
    expect(bodyColumns?.columns).toHaveLength(CLASSIC_PDF_LAYOUT_CONTRACT.columnCount);
  });

  // Cenário: Cabeçalho e legenda Classic iguais ao PNG (título + data à esquerda; bolinhas à direita).
  // Objetivo: Garantir legenda com ○ não respondido + ● coloridos por escala, sem banners carmesim.
  it('should mirror PNG Classic header/legend with unanswered empty marker and colored filled markers', () => {
    const docDef = buildClassicPdfDocumentDefinition(MOCK_SCHEMA, MOCK_ROWS, MOCK_TEXTS);
    const serialized = JSON.stringify(docDef.content);

    expect(serialized).toContain('Checklist');
    expect(serialized).not.toContain('CHECKLIST');
    expect(serialized).toContain('Gerado em: 25/11/2026, 14:31');
    expect(serialized).toContain(`${CLASSIC_PDF_LAYOUT_CONTRACT.emptyMarker} `);
    expect(serialized).toContain('Não respondido');
    expect(serialized).toContain(`${CLASSIC_PDF_LAYOUT_CONTRACT.filledMarker} `);
    expect(serialized).toContain('Limite Rígido (Não)');
    expect(serialized).toContain('#D32F2F');
    expect(serialized).toContain('#7B1FA2');
    expect(serialized).not.toContain('#DC2626');
    expect(serialized).not.toContain('#FEE2E2');
    expect(serialized).not.toContain('Protocolos essenciais');
  });

  // Cenário: Linhas de escala dual-role e textos livres no Classic.
  // Objetivo: Confirmar ●/○ + rótulos de item e linhas de texto no formato "Label: / valor".
  it('should render dual-role circle markers and text rows like the PNG Classic sheet', () => {
    const docDef = buildClassicPdfDocumentDefinition(MOCK_SCHEMA, MOCK_ROWS, MOCK_TEXTS);
    const serialized = JSON.stringify(docDef.content);

    expect(serialized).toContain('Bondage e Contenção');
    expect(serialized).toContain('Dar, Receber');
    expect(serialized).toContain('Algemas e contenção leve');
    expect(serialized).toContain(CLASSIC_PDF_LAYOUT_CONTRACT.filledMarker);
    expect(serialized).toContain(CLASSIC_PDF_LAYOUT_CONTRACT.emptyMarker);
    expect(serialized).toContain('#F57C00');
    expect(serialized).toContain('Safeword:');
    expect(serialized).toContain('Semáforo');
    expect(serialized).toContain('Alergias:');
  });

  // Cenário: Dispatcher `buildPdfDocumentDefinition` roteando Classic vs Modern.
  // Objetivo: Classic usa o contrato PNG; Modern permanece em tabelas com células preenchidas.
  it('should route classic layout through the PNG-aligned builder while modern keeps table fills', () => {
    const classic = buildPdfDocumentDefinition(MOCK_SCHEMA, MOCK_ROWS, MOCK_TEXTS, 'classic');
    const modern = buildPdfDocumentDefinition(MOCK_SCHEMA, MOCK_ROWS, MOCK_TEXTS, 'modern');

    expect(classic.pageOrientation).toBe('landscape');
    expect(modern.pageOrientation).toBe('portrait');

    const classicSerialized = JSON.stringify(classic.content);
    const modernSerialized = JSON.stringify(modern.content);

    expect(classicSerialized).toContain(CLASSIC_PDF_LAYOUT_CONTRACT.filledMarker);
    expect(classicSerialized).not.toContain('"fillColor":"#F1F5F9"');
    expect(modernSerialized).toContain('"fillColor":"#F1F5F9"');
    expect(modernSerialized).toContain('Protocolos essenciais');
    expect(modernSerialized).not.toContain(CLASSIC_PDF_LAYOUT_CONTRACT.filledMarker);
  });
});
