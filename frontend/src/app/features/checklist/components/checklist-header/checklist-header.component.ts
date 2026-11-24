import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChecklistViewMode, ScaleOption, SupportedLanguage } from '../../../../core/models';

export interface ChecklistHeaderLabels {
  readonly title: string;
  readonly subtitle: string;
  readonly languageLabel: string;
  readonly accordionMode: string;
  readonly stepperMode?: string;
  readonly classicMode?: string;
  readonly fullMode: string;
  readonly quickFillButton: string;
  readonly searchPlaceholder: string;
  readonly onlyUnanswered: string;
  readonly clearAll: string;
  readonly progressLabel: string;
  readonly exportButton: string;
  readonly legendTitle: string;
  readonly privacyNotice: string;
  readonly clearSearch: string;
  readonly controlsSectionTitle?: string;
  readonly saveNowTooltip?: string;
  readonly saveButton?: string;
  readonly autosaveToggleLabel?: string;
  readonly hideHeaderLabel?: string;
  readonly showHeaderLabel?: string;
  readonly hideHeaderAriaLabel?: string;
  readonly showHeaderAriaLabel?: string;
}

export const DEFAULT_CHECKLIST_HEADER_LABELS: ChecklistHeaderLabels = {
  title: 'Checklist',
  subtitle: 'Checklist de Limites, Práticas e Consentimento Consensual',
  languageLabel: 'Idioma',
  accordionMode: 'Guiado (Accordion)',
  stepperMode: 'Guiado (Passos)',
  classicMode: 'Modo Clássico',
  fullMode: 'Visão Completa',
  quickFillButton: 'Preenchimento Rápido',
  searchPlaceholder: 'Buscar prática ou categoria...',
  onlyUnanswered: 'Apenas não respondidos',
  clearAll: 'Limpar tudo',
  progressLabel: 'Progresso',
  exportButton: 'Exportar',
  legendTitle: 'Legenda da Escala',
  privacyNotice: 'Privacidade local: seus dados permanecem exclusivamente no seu navegador.',
  clearSearch: 'Limpar busca',
  controlsSectionTitle: 'Visualização, Filtros e Ações',
  saveNowTooltip: 'Salvar agora (criptografado)',
  saveButton: 'Salvar',
  autosaveToggleLabel: 'Salvamento automático',
  hideHeaderLabel: 'Ocultar',
  showHeaderLabel: 'Mostrar',
  hideHeaderAriaLabel: 'Ocultar cabeçalho do checklist',
  showHeaderAriaLabel: 'Mostrar cabeçalho do checklist',
};

interface SelectOption<T> {
  label: string;
  value: T;
}

/**
 * Modular checklist header with collapsible content body (Ocultar/Mostrar),
 * view mode selection, filters, and encrypted save/export actions.
 */
@Component({
  selector: 'app-checklist-header',
  imports: [MatButtonModule, MatButtonToggleModule, MatSlideToggleModule, MatTooltipModule],
  templateUrl: './checklist-header.component.html',
  styleUrl: './checklist-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistHeaderComponent {
  readonly currentLang = input<SupportedLanguage>('pt-BR');
  readonly viewMode = input.required<ChecklistViewMode>();
  readonly searchQuery = input<string>('');
  readonly onlyUnanswered = input.required<boolean>();
  readonly answeredCount = input<number>(0);
  readonly totalCount = input<number>(0);
  readonly progressPercentage = input<number>(0);
  readonly scales = input<readonly ScaleOption[]>([]);
  readonly scaleLabels = input<Readonly<Record<string, string>>>({});
  readonly hasAnswers = input.required<boolean>();
  readonly autosaveText = input<string>('Autosave criptografado ativo (a cada 1 min)');
  readonly isAutosaving = input<boolean>(false);
  readonly hasUnsavedChanges = input<boolean>(false);
  readonly autosaveEnabled = input<boolean>(true);
  readonly labels = input<ChecklistHeaderLabels>(DEFAULT_CHECKLIST_HEADER_LABELS);

  readonly viewModeChange = output<ChecklistViewMode>();
  readonly searchQueryChange = output<string>();
  readonly onlyUnansweredChange = output<boolean>();
  readonly clearAll = output<void>();
  readonly goToExport = output<void>();
  readonly saveNow = output<void>();
  readonly autosaveEnabledChange = output<boolean>();

  protected readonly headerExpanded = signal(true);
  protected readonly isChecklistComplete = computed<boolean>(
    () => this.totalCount() > 0 && this.answeredCount() >= this.totalCount(),
  );

  protected readonly controlsSectionTitle = computed<string>(
    () =>
      this.labels().controlsSectionTitle ?? DEFAULT_CHECKLIST_HEADER_LABELS.controlsSectionTitle!,
  );

  protected readonly saveNowTooltip = computed<string>(
    () => this.labels().saveNowTooltip ?? DEFAULT_CHECKLIST_HEADER_LABELS.saveNowTooltip!,
  );

  protected readonly saveButtonLabel = computed<string>(
    () => this.labels().saveButton ?? DEFAULT_CHECKLIST_HEADER_LABELS.saveButton!,
  );

  protected readonly autosaveToggleLabel = computed<string>(
    () => this.labels().autosaveToggleLabel ?? DEFAULT_CHECKLIST_HEADER_LABELS.autosaveToggleLabel!,
  );

  protected readonly toggleHeaderLabel = computed<string>(() =>
    this.headerExpanded()
      ? (this.labels().hideHeaderLabel ?? DEFAULT_CHECKLIST_HEADER_LABELS.hideHeaderLabel!)
      : (this.labels().showHeaderLabel ?? DEFAULT_CHECKLIST_HEADER_LABELS.showHeaderLabel!),
  );

  protected readonly toggleHeaderAriaLabel = computed<string>(() =>
    this.headerExpanded()
      ? (this.labels().hideHeaderAriaLabel ?? DEFAULT_CHECKLIST_HEADER_LABELS.hideHeaderAriaLabel!)
      : (this.labels().showHeaderAriaLabel ?? DEFAULT_CHECKLIST_HEADER_LABELS.showHeaderAriaLabel!),
  );

  protected readonly viewModeOptions = computed<SelectOption<ChecklistViewMode>[]>(() => [
    { label: this.labels().stepperMode ?? 'Guiado (Passos)', value: 'stepper' },
    { label: this.labels().classicMode ?? 'Modo Clássico', value: 'classic' },
    { label: this.labels().fullMode, value: 'full' },
    { label: this.labels().quickFillButton, value: 'quick_fill' },
  ]);

  protected toggleHeaderExpanded(): void {
    this.headerExpanded.update((expanded) => !expanded);
  }

  protected onViewModeModelChange(value: ChecklistViewMode | null): void {
    if (value === 'stepper' || value === 'classic' || value === 'full' || value === 'quick_fill') {
      this.viewModeChange.emit(value);
    }
  }

  protected onOnlyUnansweredModelChange(value: unknown): void {
    this.onlyUnansweredChange.emit(Boolean(value));
  }

  protected onAutosaveEnabledModelChange(value: unknown): void {
    this.autosaveEnabledChange.emit(Boolean(value));
  }
}
