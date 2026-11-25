import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { DraftImportWorkerService, DraftImportWorkerStage } from '../../../core/services';
import { AppImportLoadingOverlayComponent } from './import-loading-overlay.component';

describe('AppImportLoadingOverlayComponent', () => {
  const isProcessing = signal(false);
  const stage = signal<DraftImportWorkerStage>('reading');
  const progress = signal(0);
  const fileName = signal('');

  let fixture: ComponentFixture<AppImportLoadingOverlayComponent>;

  beforeEach(async () => {
    isProcessing.set(false);
    stage.set('reading');
    progress.set(0);
    fileName.set('');

    await TestBed.configureTestingModule({
      imports: [AppImportLoadingOverlayComponent],
      providers: [
        provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' }),
        {
          provide: DraftImportWorkerService,
          useValue: {
            isProcessing: isProcessing.asReadonly(),
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
  // Objetivo: Garantir que o overlay permaneça oculto fora da importação e exiba etapa, arquivo e percentual durante o processamento.
  it('should stay hidden while idle and display stage, filename, and progress bar when processing', async () => {
    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelector('.import-overlay')).toBeNull();

    fileName.set('consentimento-backup.json');
    stage.set('validating');
    progress.set(85);
    isProcessing.set(true);
    await fixture.whenStable();

    const overlay = hostEl.querySelector('.import-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay?.getAttribute('aria-busy')).toBe('true');
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
});
