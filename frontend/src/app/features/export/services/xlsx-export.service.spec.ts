import { TestBed } from '@angular/core/testing';
import { ChecklistSchema, FlattenedChecklistRow, ResolvedPreviewTexts } from '../../../core/models';
import { FileDownloadService } from './file-download.service';
import { XlsxExportService } from './xlsx-export.service';

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
  title: 'Checklist Report',
  schemaVersionLabel: 'Schema Version',
  generatedAtLabel: 'Generated at',
  generatedAtValue: '2026-11-24 21:00',
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
    secondaryValueLabel: 'Enjoy',
    primaryColor: '#388E3C',
    secondaryColor: '#388E3C',
    selectedOptionsLabels: [],
    customNote: '',
  },
];

describe('XlsxExportService', () => {
  let service: XlsxExportService;
  let fileDownloadMock: { downloadBlob: jest.Mock; downloadDataUrl: jest.Mock };

  beforeEach(() => {
    fileDownloadMock = {
      downloadBlob: jest.fn(),
      downloadDataUrl: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: FileDownloadService, useValue: fileDownloadMock }],
    });

    service = TestBed.inject(XlsxExportService);
  });

  // Cenário: Exportação de planilha XLSX a partir do serviço dedicado.
  // Objetivo: Garantir normalização da extensão `.xlsx`, tipo MIME OOXML oficial e disparo do download do arquivo binário PK.
  it('should generate a styled .xlsx workbook Blob and trigger FileDownloadService', async () => {
    const result = await service.exportXlsx(
      MOCK_SCHEMA,
      MOCK_ROWS,
      MOCK_TEXTS,
      'consent-classic',
      'classic',
      {
        itemHeader: 'Prática',
        valueHeader: 'Resposta',
        legendTitle: 'Legenda',
        layoutLabel: 'Visualização Clássica',
      },
    );

    expect(result).toEqual({
      format: 'xlsx',
      filename: 'consent-classic.xlsx',
      success: true,
    });

    expect(fileDownloadMock.downloadBlob).toHaveBeenCalledTimes(1);
    const [blob, downloadedName] = fileDownloadMock.downloadBlob.mock.calls[0] as [Blob, string];
    expect(downloadedName).toBe('consent-classic.xlsx');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(blob.size).toBeGreaterThan(500);
  });

  // Cenário: Tratamento de falha durante download do arquivo XLSX.
  // Objetivo: Retornar `ExportResult` com `success: false` e mensagem descritiva sem lançar exceção não tratada.
  it('should return a failure ExportResult when FileDownloadService throws', async () => {
    fileDownloadMock.downloadBlob.mockImplementationOnce(() => {
      throw new Error('Download blocked');
    });

    const result = await service.exportXlsx(MOCK_SCHEMA, MOCK_ROWS, MOCK_TEXTS, 'broken.xlsx');

    expect(result).toEqual({
      format: 'xlsx',
      filename: 'broken.xlsx',
      success: false,
      errorMessage: 'Download blocked',
    });
  });
});
