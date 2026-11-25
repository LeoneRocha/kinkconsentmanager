import { TestBed } from '@angular/core/testing';
import type { Content, ContentTable, TDocumentDefinitions } from 'pdfmake/interfaces';
import { ChecklistSchema, FlattenedChecklistRow, ResolvedPreviewTexts } from '../../../core/models';
import { BackgroundWorkerMessage, DRAFT_IMPORT_WORKER_FACTORY } from '../../../core/services';
import { FileDownloadService } from './file-download.service';
import { PDF_MAKER_LOADER, PdfExportService, PdfMakerInstance } from './pdf-export.service';

const MOCK_SCHEMA: ChecklistSchema = {
  schemaVersion: '1.0.0',
  scales: [
    { id: 'hard_limit', order: 1, color: '#D32F2F', contrastColor: '#FFFFFF', icon: 'pi pi-ban' },
    {
      id: 'curious',
      order: 3,
      color: '#FBC02D',
      contrastColor: '#111827',
      icon: 'pi pi-question-circle',
    },
    {
      id: 'enjoy',
      order: 4,
      color: '#388E3C',
      contrastColor: '#FFFFFF',
      icon: 'pi pi-check-circle',
    },
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
        { id: 'item_self', type: 'scale_matrix', dualRole: false, rolePairId: 'general' },
      ],
    },
  ],
};

const MOCK_TEXTS: ResolvedPreviewTexts = {
  title: 'Kink Consent Manager Report',
  schemaVersionLabel: 'Schema Version',
  generatedAtLabel: 'Generated at',
  generatedAtValue: '2026-11-22 18:45',
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
    grp_safety: { title: 'Safety & Health', description: 'Essential protocols' },
    grp_bondage: { title: 'Bondage' },
  },
  items: {
    item_sw: { label: 'Safeword' },
    item_notes: { label: 'Allergies' },
    item_rope: { label: 'Rope Bondage' },
    item_self: { label: 'Self-tying' },
  },
  options: {
    opt_traffic: 'Traffic Light',
  },
};

const MOCK_ROWS: readonly FlattenedChecklistRow[] = [
  {
    groupId: 'grp_safety',
    groupTitle: 'Safety & Health',
    itemId: 'item_sw',
    itemLabel: 'Safeword',
    isDualRole: false,
    primaryRoleLabel: 'General',
    primaryValueLabel: 'Traffic Light',
    selectedOptionsLabels: ['Traffic Light'],
    customNote: 'Red stops immediately',
  },
  {
    groupId: 'grp_safety',
    groupTitle: 'Safety & Health',
    itemId: 'item_notes',
    itemLabel: 'Allergies',
    isDualRole: false,
    primaryRoleLabel: 'General',
    primaryValueLabel: 'No latex',
    selectedOptionsLabels: [],
    customNote: 'No latex',
  },
  {
    groupId: 'grp_bondage',
    groupTitle: 'Bondage',
    itemId: 'item_rope',
    itemLabel: 'Rope Bondage',
    isDualRole: true,
    primaryRoleLabel: 'Giving',
    secondaryRoleLabel: 'Receiving',
    primaryValueLabel: 'Curious',
    secondaryValueLabel: 'Not answered',
    primaryColor: '#FBC02D',
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
    primaryValueLabel: 'Hard Limit',
    primaryColor: '#D32F2F',
    selectedOptionsLabels: [],
    customNote: '',
  },
];

describe('PdfExportService', () => {
  let service: PdfExportService;
  let downloadMock: jest.Mock<Promise<void>, [string?]>;
  let createPdfMock: jest.Mock<{ download: typeof downloadMock }, [TDocumentDefinitions]>;
  let loaderMock: jest.Mock<Promise<PdfMakerInstance>, []>;

  beforeEach(() => {
    downloadMock = jest.fn<Promise<void>, [string?]>().mockResolvedValue(undefined);
    createPdfMock = jest
      .fn<{ download: typeof downloadMock }, [TDocumentDefinitions]>()
      .mockReturnValue({ download: downloadMock });
    loaderMock = jest.fn<Promise<PdfMakerInstance>, []>().mockResolvedValue({
      createPdf: createPdfMock,
    });

    TestBed.configureTestingModule({
      providers: [{ provide: PDF_MAKER_LOADER, useValue: loaderMock }],
    });

    service = TestBed.inject(PdfExportService);
  });

  it('should build a TDocumentDefinitions containing title, metadata, legend colors, group tables with dontBreakRows, and dynamic page footer', () => {
    const docDef = service.buildDocumentDefinition(MOCK_SCHEMA, MOCK_ROWS, MOCK_TEXTS);
    const content = docDef.content as Content[];

    expect(docDef.pageSize).toBe('A4');
    expect(docDef.info?.title).toBe('Kink Consent Manager Report');

    const serialized = JSON.stringify(content);
    expect(serialized).toContain('Kink Consent Manager Report');
    expect(serialized).not.toContain('Schema Version');
    expect(serialized).not.toContain('1.0.0');
    expect(serialized).toContain('2026-11-22 18:45');
    expect(serialized).toContain('Essential protocols');
    expect(serialized).toContain('Red stops immediately');
    expect(serialized).toContain('#FBC02D');
    expect(serialized).toContain('#D32F2F');
    expect(serialized).toContain('#111827');

    const tables = content.filter(
      (node): node is ContentTable => typeof node === 'object' && node !== null && 'table' in node,
    );
    // 1 legend table + 2 group tables
    expect(tables.length).toBe(3);
    for (const tableNode of tables) {
      expect(tableNode.table.dontBreakRows).toBe(true);
    }

    // Dynamic footer test
    expect(typeof docDef.footer).toBe('function');
    const footerFn = docDef.footer as (currentPage: number, pageCount: number) => Content;
    const footerOutput = JSON.stringify(footerFn(2, 5));
    expect(footerOutput).toContain('Page 2 / 5');
  });

  it('should invoke pdfMakerLoader, createPdf, and download on exportPdf', async () => {
    const result = await service.exportPdf(MOCK_SCHEMA, MOCK_ROWS, MOCK_TEXTS, 'consent-report');

    expect(loaderMock).toHaveBeenCalledTimes(1);
    expect(createPdfMock).toHaveBeenCalledTimes(1);
    expect(downloadMock).toHaveBeenCalledWith('consent-report.pdf');
    expect(result).toEqual({
      format: 'pdf',
      filename: 'consent-report.pdf',
      success: true,
    });
  });

  it('should return a failure ExportResult if pdfMakerLoader or download fails', async () => {
    loaderMock.mockRejectedValueOnce(new Error('Failed to load vfs_fonts'));

    const result = await service.exportPdf(MOCK_SCHEMA, MOCK_ROWS, MOCK_TEXTS, 'failed.pdf');

    expect(result).toEqual({
      format: 'pdf',
      filename: 'failed.pdf',
      success: false,
      errorMessage: 'Failed to load vfs_fonts',
    });
  });

  // Cenário: Construção de PDF seguindo o layout Clássico alinhado ao PNG Classic.
  // Objetivo: Garantir paisagem, marcadores ●/○, legenda com não respondido e ausência de banners carmesim.
  it('should build classic PDF as a PNG-aligned multi-column circle sheet', () => {
    const docDef = service.buildDocumentDefinition(MOCK_SCHEMA, MOCK_ROWS, MOCK_TEXTS, 'classic');
    const serialized = JSON.stringify(docDef.content);

    expect(docDef.pageOrientation).toBe('landscape');
    expect(serialized).toContain('Kink Consent Manager Report');
    expect(serialized).not.toContain('KINK CONSENT MANAGER REPORT');
    expect(serialized).toContain('●');
    expect(serialized).toContain('○ ');
    expect(serialized).toContain('Not answered');
    expect(serialized).toContain('Giving, Receiving');
    expect(serialized).not.toContain('#DC2626');
    expect(serialized).not.toContain('#FEE2E2');
    expect(serialized).not.toContain('Essential protocols');
  });

  // Cenário: Geração de PDF acelerada por Web Worker transferindo bytes prontos.
  // Objetivo: Confirmar uso do worker quando disponível e download direto do Blob sem chamar o loader principal.
  it('should download worker-generated PDF Blob directly when Web Worker returns PDF bytes', async () => {
    const listeners = new Map<string, ((event: unknown) => void)[]>();
    const downloadBlobMock = jest.fn();
    const fakeWorker = {
      postMessage: jest.fn((req: { requestId: string }) => {
        queueMicrotask(() => {
          const msg: BackgroundWorkerMessage = {
            type: 'result',
            requestId: req.requestId,
            task: 'export_pdf',
            buffer: new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer,
          };
          (listeners.get('message') ?? []).forEach((cb) => cb({ data: msg }));
        });
      }),
      terminate: jest.fn(),
      addEventListener: jest.fn((type: string, cb: (event: unknown) => void) => {
        listeners.set(type, [...(listeners.get(type) ?? []), cb]);
      }),
      removeEventListener: jest.fn((type: string, cb: (event: unknown) => void) => {
        listeners.set(
          type,
          (listeners.get(type) ?? []).filter((entry) => entry !== cb),
        );
      }),
    } as unknown as Worker;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PDF_MAKER_LOADER, useValue: loaderMock },
        { provide: DRAFT_IMPORT_WORKER_FACTORY, useValue: () => fakeWorker },
        {
          provide: FileDownloadService,
          useValue: { downloadBlob: downloadBlobMock, downloadDataUrl: jest.fn() },
        },
      ],
    });

    const workerPdfService = TestBed.inject(PdfExportService);
    const result = await workerPdfService.exportPdf(
      MOCK_SCHEMA,
      MOCK_ROWS,
      MOCK_TEXTS,
      'worker-report',
      'classic',
    );

    expect(loaderMock).not.toHaveBeenCalled();
    expect(downloadBlobMock).toHaveBeenCalledWith(expect.any(Blob), 'worker-report.pdf');
    expect(result).toEqual({
      format: 'pdf',
      filename: 'worker-report.pdf',
      success: true,
    });
  });
});
