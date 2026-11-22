import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { ChecklistSchema } from '../../../../core/models';
import { ISchemaRepository, SCHEMA_REPOSITORY_TOKEN } from '../../../../core/repositories';
import { ChecklistStateService } from '../../../../core/services';
import {
  FileDownloadService,
  PDF_MAKER_LOADER,
  PdfMakerInstance,
  PNG_RENDERER,
} from '../../services';
import { ExportPageComponent } from './export-page.component';

const MOCK_SCHEMA: ChecklistSchema = {
  schemaVersion: '1.0.0',
  scales: [
    { id: 'hard_limit', order: 1, color: '#D32F2F', contrastColor: '#FFFFFF', icon: 'pi pi-ban' },
    { id: 'enjoy', order: 2, color: '#388E3C', contrastColor: '#FFFFFF', icon: 'pi pi-check-circle' },
  ],
  groups: [
    {
      id: 'grp_safety',
      order: 1,
      defaultDualRole: false,
      rolePairId: 'general',
      items: [
        { id: 'item_safeword', type: 'single_choice', options: ['opt_traffic'] },
      ],
    },
    {
      id: 'grp_bondage',
      order: 2,
      defaultDualRole: true,
      rolePairId: 'giving_receiving',
      items: [
        { id: 'item_rope', type: 'scale_matrix' },
      ],
    },
  ],
};

const PT_BR_TRANSLATIONS = {
  ui: {
    title: 'KinkConsentManager',
    exportTitle: 'Prévia e Exportação do Checklist',
    exportSubtitle: 'Revise suas respostas',
    privacyNotice: 'Privacidade local',
    backToChecklist: 'Voltar ao Checklist',
    downloadPng: 'Baixar PNG',
    downloadPdf: 'Baixar PDF',
    exportJson: 'Exportar JSON',
    importJson: 'Importar JSON',
    exportCsv: 'Exportar CSV',
    schemaVersionLabel: 'Versão do Schema',
    generatedAtLabel: 'Gerado em',
    notAnswered: 'Não respondido',
    otherOptionLabel: 'Outro',
    previewHeading: 'Resumo Completo das Respostas',
    loadingSchema: 'Carregando checklist...',
    loadingError: 'Erro ao carregar.',
    retry: 'Tentar novamente',
    exportSuccess: 'Arquivo exportado com sucesso.',
    exportError: 'Erro na exportação.',
    importSuccess: 'Rascunho JSON importado e restaurado com sucesso.',
    importErrorInvalidJson: 'Arquivo inválido.',
    importErrorIncompatibleVersion: 'Versão do schema incompatível.',
  },
  scales: {
    hard_limit: 'Limite Rígido',
    enjoy: 'Gosto',
  },
  roles: {
    giving_receiving: { primary: 'Ativo', secondary: 'Passivo' },
    general: { primary: 'Geral' },
  },
  groups: {
    grp_safety: { title: 'Segurança' },
    grp_bondage: { title: 'Bondage' },
  },
  items: {
    item_safeword: { label: 'Safeword' },
    item_rope: { label: 'Cordas' },
  },
  options: {
    opt_traffic: 'Semáforo',
  },
};

function createFileWithText(content: string, filename: string): File {
  const file = new File([content], filename, { type: 'application/json' });
  if (typeof file.text !== 'function') {
    Object.defineProperty(file, 'text', {
      value: () => Promise.resolve(content),
      configurable: true,
    });
  }
  return file;
}

describe('ExportPageComponent', () => {
  let fixture: ComponentFixture<ExportPageComponent>;
  let checklistState: ChecklistStateService;
  let messageService: MessageService;
  let router: Router;

  let schemaRepoMock: { getChecklistSchema: ReturnType<typeof vi.fn<ISchemaRepository['getChecklistSchema']>> };
  let fileDownloadMock: { downloadBlob: ReturnType<typeof vi.fn>; downloadDataUrl: ReturnType<typeof vi.fn> };
  let pngRendererMock: ReturnType<typeof vi.fn<(el: HTMLElement) => Promise<string>>>;
  let pdfDownloadMock: ReturnType<typeof vi.fn<(name?: string) => Promise<void>>>;
  let pdfLoaderMock: ReturnType<typeof vi.fn<() => Promise<PdfMakerInstance>>>;

  beforeEach(async () => {
    localStorage.clear();

    schemaRepoMock = {
      getChecklistSchema: vi.fn<ISchemaRepository['getChecklistSchema']>().mockReturnValue(
        of(MOCK_SCHEMA),
      ),
    };
    fileDownloadMock = {
      downloadBlob: vi.fn(),
      downloadDataUrl: vi.fn(),
    };
    pngRendererMock = vi
      .fn<(el: HTMLElement) => Promise<string>>()
      .mockResolvedValue('data:image/png;base64,EXPORTED');
    pdfDownloadMock = vi.fn<(name?: string) => Promise<void>>().mockResolvedValue(undefined);
    pdfLoaderMock = vi.fn<() => Promise<PdfMakerInstance>>().mockResolvedValue({
      createPdf: () => ({ download: pdfDownloadMock }),
    });

    await TestBed.configureTestingModule({
      imports: [ExportPageComponent],
      providers: [
        provideRouter([]),
        provideTranslateService({ lang: 'pt-BR', fallbackLang: 'pt-BR' }),
        MessageService,
        { provide: SCHEMA_REPOSITORY_TOKEN, useValue: schemaRepoMock },
        { provide: FileDownloadService, useValue: fileDownloadMock },
        { provide: PNG_RENDERER, useValue: pngRendererMock },
        { provide: PDF_MAKER_LOADER, useValue: pdfLoaderMock },
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', PT_BR_TRANSLATIONS);
    translate.use('pt-BR');

    checklistState = TestBed.inject(ChecklistStateService);
    messageService = TestBed.inject(MessageService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  const createPage = async (): Promise<void> => {
    fixture = TestBed.createComponent(ExportPageComponent);
    await fixture.whenStable();
  };

  it('should load schema via SCHEMA_REPOSITORY_TOKEN when ChecklistStateService has no schema and render visible + offscreen 1200px previews', async () => {
    expect(checklistState.schema()).toBeNull();
    await createPage();

    expect(schemaRepoMock.getChecklistSchema).toHaveBeenCalledTimes(1);
    expect(checklistState.schema()).toEqual(MOCK_SCHEMA);

    const hostEl = fixture.nativeElement as HTMLElement;
    const previews = hostEl.querySelectorAll('app-full-grid-preview');
    expect(previews.length).toBe(2);

    const offscreen = hostEl.querySelector<HTMLElement>('.export-page__offscreen-capture')!;
    expect(offscreen).not.toBeNull();
    expect(offscreen.querySelector('.full-grid-preview--print')).not.toBeNull();
  });

  it('should skip schema repository fetch when schema is already initialized in ChecklistStateService', async () => {
    checklistState.initializeSchema(MOCK_SCHEMA);
    await createPage();

    expect(schemaRepoMock.getChecklistSchema).not.toHaveBeenCalled();
  });

  it('should display an error state and allow retrying when schema loading fails', async () => {
    schemaRepoMock.getChecklistSchema
      .mockReturnValueOnce(throwError(() => new Error('Network failure')))
      .mockReturnValueOnce(of(MOCK_SCHEMA));

    await createPage();

    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelector('.export-page__error')).not.toBeNull();

    const retryBtn = hostEl.querySelector<HTMLButtonElement>('.export-page__retry-btn')!;
    retryBtn.click();
    await fixture.whenStable();

    expect(schemaRepoMock.getChecklistSchema).toHaveBeenCalledTimes(2);
    expect(checklistState.schema()).toEqual(MOCK_SCHEMA);
    expect(hostEl.querySelector('.export-page__error')).toBeNull();
  });

  it('should navigate back to /checklist when Back button is clicked', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    await createPage();

    const hostEl = fixture.nativeElement as HTMLElement;
    hostEl.querySelector<HTMLButtonElement>('button[data-action="back"]')?.click();

    expect(navigateSpy).toHaveBeenCalledWith(['/checklist']);
  });

  it('should capture the offscreen 1200px container for PNG export and display a success toast', async () => {
    const messageAddSpy = vi.spyOn(messageService, 'add');
    await createPage();

    const hostEl = fixture.nativeElement as HTMLElement;
    const offscreen = hostEl.querySelector<HTMLElement>('.export-page__offscreen-capture')!;

    hostEl.querySelector<HTMLButtonElement>('button[data-action="png"]')?.click();
    await fixture.whenStable();

    expect(pngRendererMock).toHaveBeenCalledWith(offscreen);
    expect(fileDownloadMock.downloadDataUrl).toHaveBeenCalledWith(
      'data:image/png;base64,EXPORTED',
      expect.stringMatching(/\.png$/),
    );
    expect(messageAddSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        detail: 'Arquivo exportado com sucesso.',
      }),
    );
  });

  it('should show an error toast when PNG export fails', async () => {
    pngRendererMock.mockRejectedValueOnce(new Error('PNG render crashed'));
    const messageAddSpy = vi.spyOn(messageService, 'add');
    await createPage();

    const hostEl = fixture.nativeElement as HTMLElement;
    hostEl.querySelector<HTMLButtonElement>('button[data-action="png"]')?.click();
    await fixture.whenStable();

    expect(messageAddSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        detail: 'PNG render crashed',
      }),
    );
  });

  it('should export PDF, JSON draft, and CSV with success toasts', async () => {
    const messageAddSpy = vi.spyOn(messageService, 'add');
    checklistState.setItemAnswer('item_rope', { primaryScale: 'enjoy' });
    await createPage();

    const hostEl = fixture.nativeElement as HTMLElement;

    hostEl.querySelector<HTMLButtonElement>('button[data-action="pdf"]')?.click();
    await fixture.whenStable();
    expect(pdfLoaderMock).toHaveBeenCalledTimes(1);
    expect(pdfDownloadMock).toHaveBeenCalledWith(expect.stringMatching(/\.pdf$/));

    hostEl.querySelector<HTMLButtonElement>('button[data-action="json"]')?.click();
    await fixture.whenStable();
    expect(fileDownloadMock.downloadBlob).toHaveBeenCalledWith(
      expect.any(Blob),
      expect.stringMatching(/\.json$/),
    );

    hostEl.querySelector<HTMLButtonElement>('button[data-action="csv"]')?.click();
    await fixture.whenStable();
    expect(fileDownloadMock.downloadBlob).toHaveBeenCalledWith(
      expect.any(Blob),
      expect.stringMatching(/\.csv$/),
    );

    expect(messageAddSpy).toHaveBeenCalledTimes(3);
  });

  it('should import a valid JSON draft file, update ChecklistStateService, and show success toast', async () => {
    const messageAddSpy = vi.spyOn(messageService, 'add');
    await createPage();

    const payload = JSON.stringify({
      schemaVersion: '1.0.0',
      exportedAt: '2026-11-22T18:30:00.000Z',
      language: 'pt-BR',
      answers: {
        item_safeword: { selectedOption: 'opt_traffic' },
        item_rope: { primaryScale: 'enjoy', secondaryScale: 'hard_limit' },
      },
    });
    const file = createFileWithText(payload, 'restored.json');

    const hostEl = fixture.nativeElement as HTMLElement;
    const fileInput = hostEl.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(fileInput, 'files', {
      value: { 0: file, length: 1, item: (i: number) => (i === 0 ? file : null) },
      configurable: true,
    });
    fileInput.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(checklistState.answers()['item_safeword']).toEqual({ selectedOption: 'opt_traffic' });
    expect(checklistState.answers()['item_rope']).toEqual({
      primaryScale: 'enjoy',
      secondaryScale: 'hard_limit',
    });
    expect(messageAddSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        detail: 'Rascunho JSON importado e restaurado com sucesso.',
      }),
    );
  });

  it('should show specific error toasts for invalid JSON syntax vs incompatible schema version on import', async () => {
    checklistState.setItemAnswer('item_rope', { primaryScale: 'enjoy' });
    const messageAddSpy = vi.spyOn(messageService, 'add');
    await createPage();

    const hostEl = fixture.nativeElement as HTMLElement;
    const fileInput = hostEl.querySelector<HTMLInputElement>('input[type="file"]')!;

    const invalidFile = createFileWithText('{corrupt json', 'bad.json');
    Object.defineProperty(fileInput, 'files', {
      value: { 0: invalidFile, length: 1, item: (i: number) => (i === 0 ? invalidFile : null) },
      configurable: true,
    });
    fileInput.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(messageAddSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        detail: 'Arquivo inválido.',
      }),
    );

    const incompatibleFile = createFileWithText(
      JSON.stringify({
        schemaVersion: '2.0.0',
        exportedAt: '2026-11-22T18:30:00.000Z',
        language: 'pt-BR',
        answers: {},
      }),
      'v2.json',
    );
    Object.defineProperty(fileInput, 'files', {
      value: {
        0: incompatibleFile,
        length: 1,
        item: (i: number) => (i === 0 ? incompatibleFile : null),
      },
      configurable: true,
    });
    fileInput.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(messageAddSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        detail: 'Versão do schema incompatível.',
      }),
    );
    // Existing answers preserved on invalid import
    expect(checklistState.answers()['item_rope']).toEqual({ primaryScale: 'enjoy' });
  });
});
