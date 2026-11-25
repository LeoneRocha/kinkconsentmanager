import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { ChecklistSchema, FlattenedChecklistRow, ResolvedPreviewTexts } from '../models';
import { processPdfExportPayload, WorkerPdfLoaderFn } from './pdf-export.processor';

const MOCK_SCHEMA: ChecklistSchema = {
  schemaVersion: '1.0.0',
  scales: [
    { id: 'enjoy', order: 1, color: '#388E3C', contrastColor: '#FFFFFF', icon: 'pi pi-check' },
  ],
  groups: [
    {
      id: 'grp_bondage',
      order: 1,
      defaultDualRole: true,
      rolePairId: 'giving_receiving',
      items: [{ id: 'item_rope', type: 'scale_matrix' }],
    },
  ],
};

const MOCK_TEXTS: ResolvedPreviewTexts = {
  title: 'Consent Checklist',
  schemaVersionLabel: 'Schema Version',
  generatedAtLabel: 'Generated at',
  generatedAtValue: '2026-11-24 23:00',
  notAnsweredLabel: 'Not answered',
  otherLabel: 'Other',
  scales: { enjoy: 'Enjoy' },
  roles: { giving_receiving: { primary: 'Giving', secondary: 'Receiving' } },
  groups: { grp_bondage: { title: 'Bondage' } },
  items: { item_rope: { label: 'Rope Bondage' } },
  options: {},
};

const MOCK_ROWS: readonly FlattenedChecklistRow[] = [
  {
    groupId: 'grp_bondage',
    groupTitle: 'Bondage',
    itemId: 'item_rope',
    itemLabel: 'Rope Bondage',
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

describe('pdf-export.processor', () => {
  // Cenário: Processamento isolado de geração de PDF em segundo plano com loader injetado.
  // Objetivo: Garantir progresso em estágios (preparing -> building -> rendering -> complete), repasse do layout clássico e bytes retornados.
  it('should build document definition according to layout, track progress stages, and return PDF bytes', async () => {
    const capturedDefs: TDocumentDefinitions[] = [];
    const expectedBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const loaderMock: jest.MockedFunction<WorkerPdfLoaderFn> = jest.fn(async () => ({
      createPdf: (docDef: TDocumentDefinitions) => {
        capturedDefs.push(docDef);
        return {
          getBuffer: async () => expectedBytes,
        };
      },
    }));

    const milestones: [string, number][] = [];
    const bytes = await processPdfExportPayload(
      {
        task: 'export_pdf',
        requestId: 'pdf-1',
        schema: MOCK_SCHEMA,
        rows: MOCK_ROWS,
        texts: MOCK_TEXTS,
        layout: 'classic',
      },
      (stage, pct) => milestones.push([stage, pct]),
      loaderMock,
    );

    expect(loaderMock).toHaveBeenCalledTimes(1);
    expect(capturedDefs).toHaveLength(1);
    expect(capturedDefs[0].pageOrientation).toBe('landscape');
    expect(JSON.stringify(capturedDefs[0].content)).toContain('●');
    expect(JSON.stringify(capturedDefs[0].content)).toContain('○ ');
    expect(JSON.stringify(capturedDefs[0].content)).toContain('Not answered');
    expect(milestones).toEqual([
      ['preparing', 20],
      ['building', 45],
      ['rendering', 75],
      ['complete', 100],
    ]);
    expect(bytes).toBe(expectedBytes);
  });

  // Cenário: Instância do `pdfmake` sem API `getBuffer` no worker.
  // Objetivo: Lançar erro descritivo sem engolir falha silenciosamente.
  it('should throw a clear error when pdfmake getBuffer API is unavailable', async () => {
    const brokenLoader: WorkerPdfLoaderFn = async () => ({
      createPdf: () => ({}),
    });

    await expect(
      processPdfExportPayload(
        {
          task: 'export_pdf',
          requestId: 'pdf-err',
          schema: MOCK_SCHEMA,
          rows: MOCK_ROWS,
          texts: MOCK_TEXTS,
          layout: 'modern',
        },
        undefined,
        brokenLoader,
      ),
    ).rejects.toThrow('pdfmake getBuffer API is unavailable inside worker.');
  });
});
