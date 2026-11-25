import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DraftImportWorkerService, I18nService } from '../../../core/services';

const STAGE_FALLBACKS: Readonly<Record<'reading' | 'parsing' | 'validating' | 'complete', string>> =
  {
    reading: 'Lendo arquivo em segundo plano...',
    parsing: 'Processando estrutura do checklist...',
    validating: 'Validando compatibilidade e respostas...',
    complete: 'Concluído! Restaurando suas respostas...',
  };

/**
 * Overlay global translúcido exibido enquanto o Web Worker processa a importação de um rascunho JSON.
 */
@Component({
  selector: 'app-import-loading-overlay',
  templateUrl: './import-loading-overlay.component.html',
  styleUrl: './import-loading-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppImportLoadingOverlayComponent {
  protected readonly importWorker = inject(DraftImportWorkerService);
  private readonly i18n = inject(I18nService);

  protected readonly titleText = computed<string>(() => {
    this.i18n.currentLang();
    return this.translateWithFallback('importLoadingTitle', 'Importando rascunho JSON...');
  });

  protected readonly stageText = computed<string>(() => {
    this.i18n.currentLang();
    const stage = this.importWorker.stage();
    switch (stage) {
      case 'reading':
        return this.translateWithFallback('importStageReading', STAGE_FALLBACKS.reading);
      case 'parsing':
        return this.translateWithFallback('importStageParsing', STAGE_FALLBACKS.parsing);
      case 'validating':
        return this.translateWithFallback('importStageValidating', STAGE_FALLBACKS.validating);
      case 'complete':
        return this.translateWithFallback('importStageComplete', STAGE_FALLBACKS.complete);
    }
  });

  protected readonly backgroundBadgeText = computed<string>(() => {
    this.i18n.currentLang();
    return this.translateWithFallback('importBackgroundBadge', 'Processamento local em background');
  });

  private translateWithFallback(key: string, fallback: string): string {
    const resolved = this.i18n.translateUi(key);
    return resolved === `ui.${key}` ? fallback : resolved;
  }
}
