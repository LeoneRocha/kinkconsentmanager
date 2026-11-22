import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ChecklistViewMode, ScaleOption, SupportedLanguage } from '../../../../core/models';
import { LegendBarComponent, ProgressIndicatorComponent } from '../../../../shared/components';

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
}

export const DEFAULT_CHECKLIST_HEADER_LABELS: ChecklistHeaderLabels = {
  title: 'KinkConsentManager',
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
};

interface SelectOption<T> {
  label: string;
  value: T;
}

/**
 * Sticky checklist toolbar with language switch, view mode, search/filter controls, progress, and scale legend.
 */
@Component({
  selector: 'app-checklist-header',
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    SelectButtonModule,
    ToggleSwitchModule,
    ProgressIndicatorComponent,
    LegendBarComponent,
  ],
  templateUrl: './checklist-header.component.html',
  styleUrl: './checklist-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistHeaderComponent {
  readonly currentLang = input.required<SupportedLanguage>();
  readonly viewMode = input.required<ChecklistViewMode>();
  readonly searchQuery = input.required<string>();
  readonly onlyUnanswered = input.required<boolean>();
  readonly answeredCount = input.required<number>();
  readonly totalCount = input.required<number>();
  readonly progressPercentage = input.required<number>();
  readonly scales = input.required<readonly ScaleOption[]>();
  readonly scaleLabels = input.required<Readonly<Record<string, string>>>();
  readonly hasAnswers = input.required<boolean>();
  readonly labels = input<ChecklistHeaderLabels>(DEFAULT_CHECKLIST_HEADER_LABELS);

  readonly languageChange = output<SupportedLanguage>();
  readonly viewModeChange = output<ChecklistViewMode>();
  readonly searchQueryChange = output<string>();
  readonly onlyUnansweredChange = output<boolean>();
  readonly openQuickFill = output<void>();
  readonly clearAll = output<void>();
  readonly goToExport = output<void>();

  protected readonly legendExpanded = signal(true);

  protected readonly languageOptions: SelectOption<SupportedLanguage>[] = [
    { label: 'PT-BR', value: 'pt-BR' },
    { label: 'EN-US', value: 'en-US' },
  ];

  protected readonly viewModeOptions = computed<SelectOption<ChecklistViewMode>[]>(() => [
    { label: this.labels().stepperMode ?? 'Guiado (Passos)', value: 'stepper' },
    { label: this.labels().classicMode ?? 'Modo Clássico', value: 'classic' },
    { label: this.labels().fullMode, value: 'full' },
  ]);

  protected onLanguageModelChange(value: SupportedLanguage | null): void {
    if (value === 'pt-BR' || value === 'en-US') {
      this.languageChange.emit(value);
    }
  }

  protected onViewModeModelChange(value: ChecklistViewMode | null): void {
    if (value === 'stepper' || value === 'classic' || value === 'full') {
      this.viewModeChange.emit(value);
    }
  }

  protected onOnlyUnansweredModelChange(value: unknown): void {
    this.onlyUnansweredChange.emit(Boolean(value));
  }

  protected toggleLegend(): void {
    this.legendExpanded.update((expanded) => !expanded);
  }
}
