import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { Observable, of, throwError } from 'rxjs';
import { ChecklistSchema } from '../../../../core/models';
import { SCHEMA_REPOSITORY_TOKEN } from '../../../../core/repositories';
import { ChecklistStateService, UiFeedbackHostService } from '../../../../core/services';
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
    {
      id: 'enjoy',
      order: 2,
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
      items: [{ id: 'item_safeword', type: 'single_choice', options: ['opt_traffic'] }],
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

const PT_BR_TRANSLATIONS = {
  ui: {
    title: 'Kink Consent Manager',
    exportTitle: 'Prévia e Exportação do Checklist',
    exportSubtitle: 'Revise suas respostas',
    privacyNotice: 'Privacidade local',
    backToChecklist: 'Voltar ao Checklist',
    downloadPng: 'Baixar PNG',
    downloadPdf: 'Baixar PDF',
    printSummary: 'Imprimir',
    exportJson: 'Exportar JSON',
    importJson: 'Importar JSON',
    exportCsv: 'Exportar CSV',
    exportXlsx: 'Exportar XLSX',
    itemHeader: 'Prática / Item',
    valueHeader: 'Resposta',
    legendTitle: 'Legenda da Escala',
    schemaVersionLabel: 'Versão do Schema',
    generatedAtLabel: 'Gerado em',
    notAnswered: 'Não respondido',
    otherOptionLabel: 'Outro',
    previewHeading: 'Resumo Completo das Respostas',
    exportLayoutLabel: 'Estilo da prévia',
    exportLayoutModern: 'Visualização Moderna',
    exportLayoutClassic: 'Visualização Clássica',
    exportStep1Title: '1. Escolha o estilo do resumo',
    exportStep1Hint:
      'Selecione Visualização Moderna ou Visualização Clássica para ver o resumo e liberar os botões de exportação.',
    exportStep2Title: '2. Exporte seu checklist',
    exportLayoutModernDesc:
      'Tabelas detalhadas por categoria com pílulas coloridas e leitura facilitada.',
    exportLayoutClassicDesc:
      'Folha compacta em múltiplas colunas com círculos coloridos no estilo tradicional.',
    exportSelectLayoutPrompt:
      'Escolha acima entre Visualização Moderna ou Visualização Clássica para visualizar o resumo completo e habilitar os botões de exportação.',
    loadingSchema: 'Carregando checklist...',
    loadingError: 'Erro ao carregar.',
    retry: 'Tentar novamente',
    exportSuccess: 'Arquivo exportado com sucesso.',
    exportError: 'Erro na exportação.',
    notificationOkAction: 'OK',
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
  Object.defineProperty(file, 'text', {
    value: () => Promise.resolve(content),
    configurable: true,
  });
  return file;
}

describe('ExportPageComponent', () => {
  let fixture: ComponentFixture<ExportPageComponent>;
  let checklistState: ChecklistStateService;
  let feedbackHost: UiFeedbackHostService;
  let router: Router;

  let schemaRepoMock: {
    getChecklistSchema: jest.Mock<Observable<ChecklistSchema>, [version?: string]>;
  };
  let fileDownloadMock: { downloadBlob: jest.Mock; downloadDataUrl: jest.Mock };
  let pngRendererMock: jest.Mock<Promise<string>, [HTMLElement]>;
  let pdfDownloadMock: jest.Mock<Promise<void>, [string?]>;
  let pdfLoaderMock: jest.Mock<Promise<PdfMakerInstance>, []>;

  beforeEach(async () => {
    localStorage.clear();

    schemaRepoMock = {
      getChecklistSchema: jest
        .fn<Observable<ChecklistSchema>, [string?]>()
        .mockReturnValue(of(MOCK_SCHEMA)),
    };
    fileDownloadMock = {
      downloadBlob: jest.fn(),
      downloadDataUrl: jest.fn(),
    };
    pngRendererMock = jest
      .fn<Promise<string>, [HTMLElement]>()
      .mockResolvedValue('data:image/png;base64,EXPORTED');
    pdfDownloadMock = jest.fn<Promise<void>, [string?]>().mockResolvedValue(undefined);
    pdfLoaderMock = jest.fn<Promise<PdfMakerInstance>, []>().mockResolvedValue({
      createPdf: () => ({ download: pdfDownloadMock }),
    });

    await TestBed.configureTestingModule({
      imports: [ExportPageComponent],
      providers: [
        provideRouter([]),
        provideTranslateService({ lang: 'pt-BR', fallbackLang: 'pt-BR' }),
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
    feedbackHost = TestBed.inject(UiFeedbackHostService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    feedbackHost?.dismissAll();
    jest.restoreAllMocks();
    localStorage.clear();
  });

  const createPage = async (): Promise<void> => {
    fixture = TestBed.createComponent(ExportPageComponent);
    await fixture.whenStable();
  };

  it('should require choosing a layout first, keep export buttons disabled until chosen, then render visible + offscreen previews and unlock green buttons', async () => {
    expect(checklistState.schema()).toBeNull();
    await createPage();

    expect(schemaRepoMock.getChecklistSchema).toHaveBeenCalledTimes(1);
    expect(checklistState.schema()).toEqual(MOCK_SCHEMA);

    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelectorAll('app-full-grid-preview').length).toBe(0);
    expect(hostEl.querySelector('.export-page__preview-empty')).not.toBeNull();

    const pngBtn = hostEl.querySelector<HTMLButtonElement>('button[data-action="png"]')!;
    expect(pngBtn.disabled).toBe(true);
    expect(pngBtn.classList.contains('export-toolbar__btn--ready')).toBe(false);

    hostEl.querySelector<HTMLButtonElement>('button[data-layout="modern"]')?.click();
    await fixture.whenStable();

    expect(pngBtn.disabled).toBe(false);
    expect(pngBtn.classList.contains('export-toolbar__btn--ready')).toBe(true);
    expect(hostEl.querySelector('.export-page__preview-empty')).toBeNull();

    const previews = hostEl.querySelectorAll('app-full-grid-preview');
    expect(previews.length).toBe(2);

    const offscreen = hostEl.querySelector<HTMLElement>('.export-page__capture-surface')!;
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

  it('should navigate back to /checklist when fresh or /checklist/fill when checklist state is confirmed/populated', async () => {
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    await createPage();

    const hostEl = fixture.nativeElement as HTMLElement;
    hostEl.querySelector<HTMLButtonElement>('button[data-action="back"]')?.click();
    expect(navigateSpy).toHaveBeenCalledWith(['/checklist']);

    checklistState.confirmStartMode('stepper');
    hostEl.querySelector<HTMLButtonElement>('button[data-action="back"]')?.click();
    expect(navigateSpy).toHaveBeenCalledWith(['/checklist', 'fill']);
  });

  it('should capture the offscreen 1200px container for PNG export and display a success snackbar', async () => {
    const successSpy = jest.spyOn(feedbackHost, 'success');
    await createPage();

    const hostEl = fixture.nativeElement as HTMLElement;
    hostEl.querySelector<HTMLButtonElement>('button[data-layout="modern"]')?.click();
    await fixture.whenStable();

    const offscreen = hostEl.querySelector<HTMLElement>('.export-page__capture-surface')!;

    hostEl.querySelector<HTMLButtonElement>('button[data-action="png"]')?.click();
    await fixture.whenStable();

    expect(pngRendererMock).toHaveBeenCalledWith(offscreen);
    expect(fileDownloadMock.downloadDataUrl).toHaveBeenCalledWith(
      'data:image/png;base64,EXPORTED',
      expect.stringMatching(/^kink-consent-checklist-modern-\d{4}-\d{2}-\d{2}\.png$/),
    );
    expect(successSpy).toHaveBeenCalledWith(
      expect.stringContaining('Arquivo exportado com sucesso.'),
      expect.objectContaining({ actionLabel: 'OK', duration: 4000 }),
    );
  });

  it('should show an error snackbar when PNG export fails', async () => {
    pngRendererMock.mockRejectedValueOnce(new Error('PNG render crashed'));
    const errorSpy = jest.spyOn(feedbackHost, 'error');
    await createPage();

    const hostEl = fixture.nativeElement as HTMLElement;
    hostEl.querySelector<HTMLButtonElement>('button[data-layout="modern"]')?.click();
    await fixture.whenStable();

    hostEl.querySelector<HTMLButtonElement>('button[data-action="png"]')?.click();
    await fixture.whenStable();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('PNG render crashed'),
      expect.objectContaining({ actionLabel: 'OK', duration: 5000 }),
    );
  });

  it('should export PDF, JSON draft, CSV, and XLSX with success snackbars respecting selected layout', async () => {
    const successSpy = jest.spyOn(feedbackHost, 'success');
    checklistState.setItemAnswer('item_rope', { primaryScale: 'enjoy' });
    await createPage();

    const hostEl = fixture.nativeElement as HTMLElement;
    hostEl.querySelector<HTMLButtonElement>('button[data-layout="modern"]')?.click();
    await fixture.whenStable();

    hostEl.querySelector<HTMLButtonElement>('button[data-action="pdf"]')?.click();
    await fixture.whenStable();
    expect(pdfLoaderMock).toHaveBeenCalledTimes(1);
    expect(pdfDownloadMock).toHaveBeenCalledWith(
      expect.stringMatching(/^kink-consent-checklist-modern-\d{4}-\d{2}-\d{2}\.pdf$/),
    );

    hostEl.querySelector<HTMLButtonElement>('button[data-action="json"]')?.click();
    await fixture.whenStable();
    expect(fileDownloadMock.downloadBlob).toHaveBeenCalledWith(
      expect.any(Blob),
      expect.stringMatching(/^kink-consent-checklist-modern-\d{4}-\d{2}-\d{2}\.json$/),
    );

    hostEl.querySelector<HTMLButtonElement>('button[data-action="csv"]')?.click();
    await fixture.whenStable();
    expect(fileDownloadMock.downloadBlob).toHaveBeenCalledWith(
      expect.any(Blob),
      expect.stringMatching(/^kink-consent-checklist-modern-\d{4}-\d{2}-\d{2}\.csv$/),
    );

    hostEl.querySelector<HTMLButtonElement>('button[data-layout="classic"]')?.click();
    await fixture.whenStable();

    hostEl.querySelector<HTMLButtonElement>('button[data-action="xlsx"]')?.click();
    await fixture.whenStable();
    expect(fileDownloadMock.downloadBlob).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      expect.stringMatching(/^kink-consent-checklist-classic-\d{4}-\d{2}-\d{2}\.xlsx$/),
    );

    expect(successSpy).toHaveBeenCalledTimes(4);
  });

  it('should import a valid JSON draft file, update ChecklistStateService, and show success snackbar', async () => {
    const successSpy = jest.spyOn(feedbackHost, 'success');
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
    expect(successSpy).toHaveBeenCalledWith(
      expect.stringContaining('Rascunho JSON importado e restaurado com sucesso.'),
      expect.objectContaining({ actionLabel: 'OK', duration: 4000 }),
    );
  });

  it('should show specific error snackbars for invalid JSON syntax vs incompatible schema version on import', async () => {
    checklistState.setItemAnswer('item_rope', { primaryScale: 'enjoy' });
    const errorSpy = jest.spyOn(feedbackHost, 'error');
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

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Arquivo inválido.'),
      expect.objectContaining({ actionLabel: 'OK', duration: 5000 }),
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

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Versão do schema incompatível.'),
      expect.objectContaining({ actionLabel: 'OK', duration: 5000 }),
    );
    // Existing answers preserved on invalid import
    expect(checklistState.answers()['item_rope']).toEqual({ primaryScale: 'enjoy' });
  });

  it('should switch preview and PNG capture container between modern and classic layouts', async () => {
    checklistState.setItemAnswer('item_rope', { primaryScale: 'enjoy' });
    await createPage();

    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelector('.export-page__capture-surface')).toBeNull();
    expect(hostEl.querySelector('.export-page__preview-empty')).not.toBeNull();

    const modernCard = hostEl.querySelector<HTMLButtonElement>('button[data-layout="modern"]')!;
    const classicCard = hostEl.querySelector<HTMLButtonElement>('button[data-layout="classic"]')!;
    modernCard.click();
    await fixture.whenStable();

    let captureSurface = hostEl.querySelector<HTMLElement>('.export-page__capture-surface')!;
    expect(captureSurface.classList.contains('export-page__capture-surface--classic')).toBe(false);
    expect(hostEl.querySelector('.export-page__preview .full-grid-preview--classic')).toBeNull();

    classicCard.click();
    await fixture.whenStable();

    captureSurface = hostEl.querySelector<HTMLElement>('.export-page__capture-surface')!;
    expect(captureSurface.classList.contains('export-page__capture-surface--classic')).toBe(true);
    expect(
      hostEl.querySelector('.export-page__preview .full-grid-preview--classic'),
    ).not.toBeNull();
    expect(captureSurface.querySelector('.full-grid-preview--classic')).not.toBeNull();

    hostEl.querySelector<HTMLButtonElement>('button[data-action="png"]')?.click();
    await fixture.whenStable();
    expect(fileDownloadMock.downloadDataUrl).toHaveBeenCalledWith(
      'data:image/png;base64,EXPORTED',
      expect.stringMatching(/^kink-consent-checklist-classic-\d{4}-\d{2}-\d{2}\.png$/),
    );
  });

  it('should trigger window.print with layout-tagged document title and restore original title afterwards', async () => {
    checklistState.setItemAnswer('item_rope', { primaryScale: 'enjoy' });
    await createPage();

    const originalTitle = document.title;
    let titleDuringPrint = '';
    const printSpy = jest.spyOn(window, 'print').mockImplementation(() => {
      titleDuringPrint = document.title;
    });

    const hostEl = fixture.nativeElement as HTMLElement;
    const printBtn = hostEl.querySelector<HTMLButtonElement>('button[data-action="print"]')!;
    expect(printBtn.disabled).toBe(true);

    hostEl.querySelector<HTMLButtonElement>('button[data-layout="classic"]')?.click();
    await fixture.whenStable();

    expect(printBtn.disabled).toBe(false);
    expect(printBtn.classList.contains('export-toolbar__btn--ready')).toBe(true);

    printBtn.click();
    await fixture.whenStable();

    expect(printSpy).toHaveBeenCalledTimes(1);
    expect(titleDuringPrint).toMatch(/^kink-consent-checklist-classic-\d{4}-\d{2}-\d{2}$/);
    expect(document.title).toBe(originalTitle);
  });
});
