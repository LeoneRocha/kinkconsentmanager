import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BackgroundTaskWorkerService, I18nService } from '../../../core/services';

const STAGE_FALLBACKS = {
  reading: 'Lendo arquivo em segundo plano...',
  parsing: 'Processando estrutura do checklist...',
  validating: 'Validando compatibilidade e respostas...',
  preparing: 'Preparando dados do checklist...',
  building: 'Estruturando layout selecionado...',
  rendering: 'Renderizando documento em segundo plano...',
  packaging: 'Empacotando arquivo para download...',
  completeImport: 'Concluído! Restaurando suas respostas...',
  completeExport: 'Concluído! Iniciando download...',
} as const;

/**
 * Overlay global translúcido exibido enquanto o sistema processa tarefas isoladas
 * em segundo plano (importação JSON, PNG, PDF, XLSX e CSV), com feedback de progresso
 * virtual ou sincronizado e estado final verde de conclusão.
 */
@Component({
  selector: 'app-import-loading-overlay',
  templateUrl: './import-loading-overlay.component.html',
  styleUrl: './import-loading-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppImportLoadingOverlayComponent {
  protected readonly worker = inject(BackgroundTaskWorkerService);
  private readonly i18n = inject(I18nService);

  protected readonly coreIconClass = computed<string>(() => {
    if (this.worker.isCompleted()) {
      return 'fa-solid fa-check';
    }
    switch (this.worker.taskKind()) {
      case 'export_png':
        return 'fa-solid fa-image';
      case 'export_pdf':
        return 'fa-solid fa-file-pdf';
      case 'export_xlsx':
        return 'fa-solid fa-file-excel';
      case 'export_csv':
        return 'fa-solid fa-file-csv';
      case 'import_json':
      default:
        return 'fa-solid fa-file-import';
    }
  });

  protected readonly fileIconClass = computed<string>(() => {
    switch (this.worker.taskKind()) {
      case 'export_png':
        return 'fa-solid fa-image';
      case 'export_pdf':
        return 'fa-solid fa-file-pdf';
      case 'export_xlsx':
        return 'fa-solid fa-file-excel';
      case 'export_csv':
        return 'fa-solid fa-file-csv';
      case 'import_json':
      default:
        return 'fa-solid fa-file-code';
    }
  });

  protected readonly titleText = computed<string>(() => {
    this.i18n.currentLang();
    if (this.worker.isCompleted()) {
      return this.translateWithFallback('workerCompletedTitle', 'Processamento concluído!');
    }
    switch (this.worker.taskKind()) {
      case 'export_png':
        return this.translateWithFallback('exportPngLoadingTitle', 'Gerando imagem PNG...');
      case 'export_pdf':
        return this.translateWithFallback('exportPdfLoadingTitle', 'Gerando documento PDF...');
      case 'export_xlsx':
        return this.translateWithFallback(
          'exportXlsxLoadingTitle',
          'Gerando planilha Excel (XLSX)...',
        );
      case 'export_csv':
        return this.translateWithFallback('exportCsvLoadingTitle', 'Gerando arquivo CSV...');
      case 'import_json':
      default:
        return this.translateWithFallback('importLoadingTitle', 'Importando rascunho JSON...');
    }
  });

  protected readonly stageText = computed<string>(() => {
    this.i18n.currentLang();
    const stage = this.worker.stage();
    const taskKind = this.worker.taskKind();
    switch (stage) {
      case 'reading':
        return this.translateWithFallback('importStageReading', STAGE_FALLBACKS.reading);
      case 'parsing':
        return this.translateWithFallback('importStageParsing', STAGE_FALLBACKS.parsing);
      case 'validating':
        return this.translateWithFallback('importStageValidating', STAGE_FALLBACKS.validating);
      case 'preparing':
        return this.translateWithFallback('workerStagePreparing', STAGE_FALLBACKS.preparing);
      case 'building':
        return this.translateWithFallback('workerStageBuilding', STAGE_FALLBACKS.building);
      case 'rendering':
        return this.translateWithFallback('workerStageRendering', STAGE_FALLBACKS.rendering);
      case 'packaging':
        return this.translateWithFallback('workerStagePackaging', STAGE_FALLBACKS.packaging);
      case 'complete':
        return taskKind === 'import_json' || taskKind === null
          ? this.translateWithFallback('importStageComplete', STAGE_FALLBACKS.completeImport)
          : this.translateWithFallback('workerStageExportComplete', STAGE_FALLBACKS.completeExport);
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
