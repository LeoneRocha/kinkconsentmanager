import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import {
  BackgroundTaskKind,
  BackgroundTaskStage,
  BackgroundTaskWorkerService,
} from '../../../core/services';
import { AppImportLoadingOverlayComponent } from './import-loading-overlay.component';

describe('AppImportLoadingOverlayComponent', () => {
  const isProcessing = signal(false);
  const isCompleted = signal(false);
  const taskKind = signal<BackgroundTaskKind | null>(null);
  const stage = signal<BackgroundTaskStage>('reading');
  const progress = signal(0);
  const fileName = signal('');

  let fixture: ComponentFixture<AppImportLoadingOverlayComponent>;

  beforeEach(async () => {
    isProcessing.set(false);
    isCompleted.set(false);
    taskKind.set(null);
    stage.set('reading');
    progress.set(0);
    fileName.set('');

    await TestBed.configureTestingModule({
      imports: [AppImportLoadingOverlayComponent],
      providers: [
        provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' }),
        {
          provide: BackgroundTaskWorkerService,
          useValue: {
            isProcessing: isProcessing.asReadonly(),
            isCompleted: isCompleted.asReadonly(),
            taskKind: taskKind.asReadonly(),
            stage: stage.asReadonly(),
            progress: progress.asReadonly(),
            fileName: fileName.asReadonly(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppImportLoadingOverlayComponent);
    await fixture.whenStable();
  });

  // Cenário: Estado ocioso vs. processamento ativo em background de arquivo JSON.
  // Objetivo: Garantir que o overlay permaneça oculto fora de execução e exiba etapa, arquivo e percentual durante importação JSON.
  it('should stay hidden while idle and display stage, filename, and progress bar when processing', async () => {
    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelector('.import-overlay')).toBeNull();

    taskKind.set('import_json');
    fileName.set('consentimento-backup.json');
    stage.set('validating');
    progress.set(85);
    isProcessing.set(true);
    await fixture.whenStable();

    const overlay = hostEl.querySelector('.import-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay?.getAttribute('aria-busy')).toBe('true');
    expect(overlay?.querySelector('.import-overlay__title')?.textContent?.trim()).toBe(
      'Importando rascunho JSON...',
    );
    expect(overlay?.querySelector('.import-overlay__core i')?.className).toContain(
      'fa-file-import',
    );
    expect(overlay?.querySelector('.import-overlay__file-name')?.textContent?.trim()).toBe(
      'consentimento-backup.json',
    );
    expect(overlay?.querySelector('.import-overlay__stage')?.textContent?.trim()).toContain(
      'Validando compatibilidade e respostas',
    );
    expect(overlay?.querySelector('.import-overlay__progress-pct')?.textContent?.trim()).toBe(
      '85%',
    );

    isProcessing.set(false);
    await fixture.whenStable();
    expect(hostEl.querySelector('.import-overlay')).toBeNull();
  });

  // Cenário: Execução em segundo plano de exportação PNG, PDF e XLSX + transição para estado visual concluído.
  // Objetivo: Verificar adaptação dinâmica para `export_png`, `export_pdf`, `export_xlsx` e estilo verde (`fa-check`, 100%) ao concluir.
  it('should adapt icon/title across export_png/pdf/xlsx and render green completed state when finished', async () => {
    const hostEl = fixture.nativeElement as HTMLElement;

    taskKind.set('export_png');
    fileName.set('checklist.png');
    stage.set('rendering');
    progress.set(60);
    isProcessing.set(true);
    await fixture.whenStable();

    expect(hostEl.querySelector('.import-overlay__title')?.textContent?.trim()).toBe(
      'Gerando imagem PNG...',
    );
    expect(hostEl.querySelector('.import-overlay__core i')?.className).toContain('fa-image');

    taskKind.set('export_pdf');
    fileName.set('checklist.pdf');
    stage.set('rendering');
    progress.set(75);
    await fixture.whenStable();

    expect(hostEl.querySelector('.import-overlay__title')?.textContent?.trim()).toBe(
      'Gerando documento PDF...',
    );
    expect(hostEl.querySelector('.import-overlay__core i')?.className).toContain('fa-file-pdf');

    taskKind.set('export_xlsx');
    fileName.set('checklist.xlsx');
    stage.set('packaging');
    progress.set(90);
    await fixture.whenStable();

    expect(hostEl.querySelector('.import-overlay__title')?.textContent?.trim()).toBe(
      'Gerando planilha Excel (XLSX)...',
    );
    expect(hostEl.querySelector('.import-overlay__core i')?.className).toContain('fa-file-excel');

    isCompleted.set(true);
    stage.set('complete');
    progress.set(100);
    await fixture.whenStable();

    expect(hostEl.querySelector('.import-overlay')?.getAttribute('aria-busy')).toBe('false');
    expect(hostEl.querySelector('.import-overlay__card--completed')).not.toBeNull();
    expect(hostEl.querySelector('.import-overlay__core i')?.className).toContain('fa-check');
    expect(hostEl.querySelector('.import-overlay__title')?.textContent?.trim()).toBe(
      'Processamento concluído!',
    );
    expect(hostEl.querySelector('.import-overlay__progress-pct')?.textContent?.trim()).toBe('100%');
  });
});
