import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
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
}

export const DEFAULT_CHECKLIST_PROGRESS_BAR_LABELS: ChecklistProgressBarLabels = {
  progressLabel: 'Progresso',
  saveButton: 'Salvar',
  saveNowTooltip: 'Salvar agora (criptografado)',
  exportButton: 'Exportar',
  autosaveToggleLabel: 'Salvamento automático',
};

/**
 * Always-visible checklist progress bar hosting encrypted Save, Export, and Autosave controls
 * alongside optional projected step-rail or scale-legend chrome.
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

  protected readonly isChecklistComplete = computed<boolean>(
    () => this.totalCount() > 0 && this.answeredCount() >= this.totalCount(),
  );

  protected onAutosaveEnabledModelChange(value: unknown): void {
    this.autosaveEnabledChange.emit(Boolean(value));
  }
}
