import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProgressIndicatorComponent } from '../../../../shared/components';

export interface ChecklistProgressBarLabels {
  readonly progressLabel: string;
  readonly saveButton: string;
  readonly saveNowTooltip: string;
  readonly exportButton: string;
  readonly autosaveToggleLabel: string;
  readonly compactEnableLabel?: string;
  readonly compactDisableLabel?: string;
}

export const DEFAULT_CHECKLIST_PROGRESS_BAR_LABELS: ChecklistProgressBarLabels = {
  progressLabel: 'Progresso',
  saveButton: 'Salvar',
  saveNowTooltip: 'Salvar agora (criptografado)',
  exportButton: 'Exportar',
  autosaveToggleLabel: 'Salvamento automático',
  compactEnableLabel: 'Modo compacto (ocultar passos e legenda)',
  compactDisableLabel: 'Expandir progresso (mostrar passos e legenda)',
};

/**
 * Always-visible checklist progress bar hosting encrypted Save, Export, and Autosave controls
 * alongside optional projected step-rail or scale-legend chrome, with a compact-mode toggle.
 */
@Component({
  selector: 'app-checklist-progress-bar',
  imports: [MatButtonModule, MatSlideToggleModule, MatTooltipModule, ProgressIndicatorComponent],
  templateUrl: './checklist-progress-bar.component.html',
  styleUrl: './checklist-progress-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistProgressBarComponent {
  readonly answeredCount = input<number>(0);
  readonly totalCount = input<number>(0);
  readonly progressPercentage = input<number>(0);
  readonly autosaveText = input<string>('Autosave criptografado ativo (a cada 1 min)');
  readonly isAutosaving = input<boolean>(false);
  readonly hasUnsavedChanges = input<boolean>(false);
  readonly autosaveEnabled = input<boolean>(true);
  readonly labels = input<ChecklistProgressBarLabels>(DEFAULT_CHECKLIST_PROGRESS_BAR_LABELS);

  readonly saveNow = output<void>();
  readonly goToExport = output<void>();
  readonly autosaveEnabledChange = output<boolean>();

  protected readonly compactMode = signal<boolean>(false);

  protected readonly isChecklistComplete = computed<boolean>(
    () => this.totalCount() > 0 && this.answeredCount() >= this.totalCount(),
  );

  protected readonly compactToggleLabel = computed<string>(() =>
    this.compactMode()
      ? (this.labels().compactDisableLabel ??
        DEFAULT_CHECKLIST_PROGRESS_BAR_LABELS.compactDisableLabel!)
      : (this.labels().compactEnableLabel ??
        DEFAULT_CHECKLIST_PROGRESS_BAR_LABELS.compactEnableLabel!),
  );

  protected toggleCompactMode(): void {
    this.compactMode.update((compact) => !compact);
  }

  protected onAutosaveEnabledModelChange(value: unknown): void {
    this.autosaveEnabledChange.emit(Boolean(value));
  }
}
