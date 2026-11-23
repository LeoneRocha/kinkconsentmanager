import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
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
};

interface SelectOption<T> {
  label: string;
  value: T;
}

/**
 * Modular checklist header with clean identity bar, interactive encrypted save button,
 * and a collapsible controls section for view mode selection, filters, and actions.
 */
@Component({
  selector: 'app-checklist-header',
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatExpansionModule,
    MatSlideToggleModule,
    MatTooltipModule,
  ],
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

  protected readonly controlsExpanded = signal(true);
  protected readonly isChecklistComplete = computed<boolean>(
    () => this.totalCount() > 0 && this.answeredCount() >= this.totalCount(),
  );

  protected readonly viewModeOptions = computed<SelectOption<ChecklistViewMode>[]>(() => [
    { label: this.labels().stepperMode ?? 'Guiado (Passos)', value: 'stepper' },
    { label: this.labels().classicMode ?? 'Modo Clássico', value: 'classic' },
    { label: this.labels().fullMode, value: 'full' },
    { label: this.labels().quickFillButton, value: 'quick_fill' },
  ]);

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
