import { TestBed } from '@angular/core/testing';
import { FlattenedChecklistRow } from '../../../core/models';
import { CsvExportService } from './csv-export.service';
import { FileDownloadService } from './file-download.service';

describe('CsvExportService', () => {
  let service: CsvExportService;
  let fileDownloadMock: {
    downloadBlob: ReturnType<typeof jest.fn>;
    downloadDataUrl: ReturnType<typeof jest.fn>;
  };

  beforeEach(() => {
    fileDownloadMock = {
      downloadBlob: jest.fn(),
      downloadDataUrl: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: FileDownloadService, useValue: fileDownloadMock }],
    });

    service = TestBed.inject(CsvExportService);
  });

  it('should prepend UTF-8 BOM and emit Excel-aligned category tables with RFC-4180 escaping', () => {
    const rows: readonly FlattenedChecklistRow[] = [
      {
        groupId: 'grp_bondage',
        groupTitle: 'Bondage, Restraints',
        itemId: 'item_rope',
        itemLabel: 'Rope "Shibari"',
        isDualRole: true,
        primaryRoleLabel: 'Giving',
        secondaryRoleLabel: 'Receiving',
        primaryValueLabel: 'Enjoy',
        secondaryValueLabel: 'Favorite',
        primaryColor: '#388E3C',
        secondaryColor: '#7B1FA2',
        selectedOptionsLabels: [],
        customNote: '',
      },
      {
        groupId: 'grp_safety',
        groupTitle: 'Safety',
        itemId: 'item_notes',
        itemLabel: 'Notes',
        isDualRole: false,
        primaryRoleLabel: 'General',
        primaryValueLabel: 'Line 1\nLine 2',
        selectedOptionsLabels: ['Opt A', 'Opt B'],
        customNote: 'Watch "knots",\r\ncheck circulation',
      },
    ];

    const csv = service.buildCsvContent(rows);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).not.toContain('Group_ID');
    const withoutBom = csv.slice(1);
    const expected = [
      '"Bondage, Restraints"',
      'Prática / Item,Giving,Receiving',
      '"Rope ""Shibari""",Enjoy,Favorite',
      '',
      'Safety',
      'Prática / Item,Resposta',
      'Notes,"Line 1\nLine 2\nWatch ""knots"",\r\ncheck circulation"',
    ].join('\r\n');

    expect(withoutBom).toBe(expected);
  });

  it('should export a UTF-8 CSV blob via FileDownloadService synchronously and in background with context', async () => {
    const rows: readonly FlattenedChecklistRow[] = [
      {
        groupId: 'grp_1',
        groupTitle: 'Afeto',
        itemId: 'item_1',
        itemLabel: 'Carinho',
        isDualRole: false,
        primaryRoleLabel: 'Geral',
        primaryValueLabel: 'Favorito',
        primaryColor: '#7B1FA2',
        selectedOptionsLabels: [],
        customNote: '',
      },
    ];

    const result = service.exportCsv(rows, 'export-checklist');

    expect(result).toEqual({
      format: 'csv',
      filename: 'export-checklist.csv',
      success: true,
    });
    expect(fileDownloadMock.downloadBlob).toHaveBeenCalledTimes(1);

    const [blob, filename] = fileDownloadMock.downloadBlob.mock.calls[0] as [Blob, string];
    expect(filename).toBe('export-checklist.csv');
    expect(blob.type).toContain('text/csv');
    const content = await blob.text();
    expect(content).toContain('Afeto');
    expect(content).toContain('Carinho,Favorito');

    const bgResult = await service.exportCsvInBackground(rows, 'bg-export', {
      labels: {
        itemHeader: 'Prática',
        valueHeader: 'Escolha',
        legendTitle: 'Legenda',
      },
    });
    expect(bgResult).toEqual({
      format: 'csv',
      filename: 'bg-export.csv',
      success: true,
    });
    const [bgBlob] = fileDownloadMock.downloadBlob.mock.calls[1] as [Blob, string];
    const bgContent = await bgBlob.text();
    expect(bgContent).toContain('Prática,Escolha');
  });

  it('should return failure ExportResult when downloadBlob throws', () => {
    fileDownloadMock.downloadBlob.mockImplementationOnce(() => {
      throw new Error('Blob failed');
    });

    const result = service.exportCsv([], 'broken.csv');

    expect(result).toEqual({
      format: 'csv',
      filename: 'broken.csv',
      success: false,
      errorMessage: 'Blob failed',
    });
  });
});
