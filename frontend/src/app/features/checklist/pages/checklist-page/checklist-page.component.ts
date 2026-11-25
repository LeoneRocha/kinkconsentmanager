import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { Subscription, take } from 'rxjs';
import {
  ChecklistViewMode,
  ItemDefinition,
  ItemResponseValue,
  ResolvedPreviewTexts,
  SupportedLanguage,
} from '../../../../core/models';
import { SCHEMA_REPOSITORY_TOKEN } from '../../../../core/repositories';
import { APP_ROUTE_COMMANDS } from '../../../../core/routes';
import {
  AccessibilityService,
  ChecklistAutosaveService,
  ChecklistStateService,
  I18nService,
  TelemetryService,
  UiFeedbackHostService,
} from '../../../../core/services';
import { LegendBarComponent } from '../../../../shared/components';
import { ChecklistHeaderComponent, ChecklistHeaderLabels } from '../../components/checklist-header';
import {
  ChecklistProgressBarComponent,
  ChecklistProgressBarLabels,
} from '../../components/checklist-progress-bar';
import {
  ChecklistStepRailComponent,
  ChecklistStepperComponent,
  ChecklistStepperLabels,
} from '../../components/checklist-stepper';
import { ClassicKinkSheetComponent } from '../../components/classic-kink-sheet';
import {
  FullViewCategoryNavComponent,
  FullViewContainerComponent,
} from '../../components/full-view-container';
import {
  QuickFillLabels,
  QuickFillWizardModalComponent,
} from '../../components/quick-fill-wizard-modal';

/**
 * Smart container coordinating checklist schema loading, stepper/classic/full view modes, localization, and navigation.
 */
@Component({
  selector: 'app-checklist-page',
  imports: [
    MatButtonModule,
    LegendBarComponent,
    ChecklistHeaderComponent,
    ChecklistProgressBarComponent,
    ChecklistStepRailComponent,
    ChecklistStepperComponent,
    ClassicKinkSheetComponent,
    FullViewCategoryNavComponent,
    FullViewContainerComponent,
    QuickFillWizardModalComponent,
  ],
  templateUrl: './checklist-page.component.html',
  styleUrl: './checklist-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistPageComponent implements OnInit {
  private readonly schemaRepository = inject(SCHEMA_REPOSITORY_TOKEN);
  protected readonly checklistState = inject(ChecklistStateService);
  protected readonly autosave = inject(ChecklistAutosaveService);
  protected readonly i18n = inject(I18nService);
  private readonly accessibility = inject(AccessibilityService);
  private readonly feedbackHost = inject(UiFeedbackHostService);
  private readonly telemetry = inject(TelemetryService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly contentContainer = viewChild<ElementRef<HTMLElement>>('contentContainer');
  protected readonly stepperRef = viewChild(ChecklistStepperComponent);
  protected readonly fullViewRef = viewChild(FullViewContainerComponent);
  private loadSubscription: Subscription | null = null;

  protected readonly isLoading = signal<boolean>(true);
  protected readonly loadError = signal<boolean>(false);
  private readonly reviewStepActive = signal<boolean>(false);
  protected readonly emptyInvalidStepIds: ReadonlySet<string> = new Set();

  protected readonly schema = this.checklistState.schema;
  protected readonly filteredGroups = this.checklistState.filteredGroups;
  protected readonly answers = this.checklistState.answers;
  protected readonly viewMode = this.checklistState.viewMode;
  protected readonly searchQuery = this.checklistState.searchQuery;
  protected readonly onlyUnanswered = this.checklistState.onlyUnanswered;
  protected readonly answeredCount = this.checklistState.answeredItemsCount;
  protected readonly totalCount = this.checklistState.totalItemsCount;
  protected readonly progressPercentage = this.checklistState.progressPercentage;

  protected readonly hasAnswers = computed<boolean>(() => Object.keys(this.answers()).length > 0);

  protected readonly isChecklistComplete = computed<boolean>(
    () => this.totalCount() > 0 && this.answeredCount() >= this.totalCount(),
  );

  protected readonly areFullViewGroupsExpanded = computed<boolean>(() => {
    const groups = this.filteredGroups();
    const collapsed = this.fullViewRef()?.collapsedIds();
    if (!collapsed) {
      return true;
    }
    return groups.length > 0 && groups.every((group) => !collapsed.has(group.id));
  });

  protected readonly activeStepperStep = computed<number>(() => {
    const groups = this.filteredGroups();
    if (groups.length === 0) {
      return 0;
    }
    if (this.reviewStepActive()) {
      return groups.length;
    }
    return Math.min(this.checklistState.activeCategoryIndex(), groups.length - 1);
  });

  protected readonly resolvedTexts = computed<ResolvedPreviewTexts | null>(() => {
    const currentSchema = this.schema();
    this.i18n.currentLang();
    if (!currentSchema) {
      return null;
    }
    return this.i18n.buildResolvedPreviewTexts(currentSchema, '');
  });

  protected readonly headerLabels = computed<ChecklistHeaderLabels>(() => {
    this.i18n.currentLang();
    return {
      title: this.translateWithFallback('navChecklist', 'Checklist'),
      subtitle: this.i18n.translateUi('subtitle'),
      languageLabel: this.i18n.translateUi('languageLabel'),
      accordionMode: this.i18n.translateUi('accordionMode'),
      stepperMode: this.translateWithFallback('stepperMode', 'Guiado (Passos)'),
      classicMode: this.translateWithFallback('classicMode', 'Modo Clássico'),
      fullMode: this.i18n.translateUi('fullMode'),
      quickFillButton: this.i18n.translateUi('quickFillButton'),
      searchPlaceholder: this.i18n.translateUi('searchPlaceholder'),
      onlyUnanswered: this.i18n.translateUi('onlyUnanswered'),
      clearAll: this.i18n.translateUi('clearAll'),
      legendTitle: this.i18n.translateUi('legendTitle'),
      clearSearch: this.i18n.translateUi('clearSelection'),
      controlsSectionTitle: this.translateWithFallback(
        'headerControlsSection',
        'Visualização, Filtros e Ações',
      ),
      hideHeaderLabel: this.translateWithFallback('headerHide', 'Ocultar'),
      showHeaderLabel: this.translateWithFallback('headerShow', 'Mostrar'),
      hideHeaderAriaLabel: this.translateWithFallback(
        'headerHideAriaLabel',
        'Ocultar cabeçalho do checklist',
      ),
      showHeaderAriaLabel: this.translateWithFallback(
        'headerShowAriaLabel',
        'Mostrar cabeçalho do checklist',
      ),
    };
  });

  protected readonly progressBarLabels = computed<ChecklistProgressBarLabels>(() => {
    this.i18n.currentLang();
    return {
      progressLabel: this.i18n.translateUi('progressLabel'),
      saveButton: this.translateWithFallback('saveButton', 'Salvar'),
      saveNowTooltip: this.translateWithFallback('autosaveSaveNow', 'Salvar agora (criptografado)'),
      exportButton: this.i18n.translateUi('navExport'),
      autosaveToggleLabel: this.translateWithFallback(
        'autosaveToggleLabel',
        'Salvamento automático',
      ),
      compactEnableLabel: this.translateWithFallback(
        'progressCompactEnable',
        'Modo compacto (ocultar passos e legenda)',
      ),
      compactDisableLabel: this.translateWithFallback(
        'progressCompactDisable',
        'Expandir progresso (mostrar passos e legenda)',
      ),
    };
  });

  protected readonly expandAllLabel = computed<string>(() => {
    this.i18n.currentLang();
    return this.translateWithFallback('expandAllCategories', 'Expandir tudo');
  });

  protected readonly collapseAllLabel = computed<string>(() => {
    this.i18n.currentLang();
    return this.translateWithFallback('collapseAllCategories', 'Recolher tudo');
  });

  protected readonly expandCategoryLabel = computed<string>(() => {
    this.i18n.currentLang();
    return this.translateWithFallback('expandCategory', 'Expandir categoria');
  });

  protected readonly collapseCategoryLabel = computed<string>(() => {
    this.i18n.currentLang();
    return this.translateWithFallback('collapseCategory', 'Recolher categoria');
  });

  protected readonly stepperLabels = computed<ChecklistStepperLabels>(() => {
    this.i18n.currentLang();
    return {
      stepLabel: this.translateWithFallback('stepLabel', 'Passo'),
      stepOfLabel: this.translateWithFallback('stepOfLabel', 'de'),
      prevStep: this.translateWithFallback('prevStep', 'Passo Anterior'),
      nextStep: this.translateWithFallback('nextStep', 'Próximo Passo'),
      goToReview: this.translateWithFallback('goToReview', 'Ir para Revisão'),
      reviewTitle: this.translateWithFallback('reviewStepTitle', 'Revisão Final'),
      reviewSubtitle: this.translateWithFallback(
        'reviewStepSubtitle',
        'Todas as categorias estão abertas abaixo para revisão rápida. Você pode recolher ou expandir cada bloco e ajustar qualquer resposta antes de exportar.',
      ),
      expandAll: this.expandAllLabel(),
      collapseAll: this.collapseAllLabel(),
      expandCategory: this.expandCategoryLabel(),
      collapseCategory: this.collapseCategoryLabel(),
      finish: this.finishLabel(),
      otherPlaceholder: this.otherPlaceholder(),
      noResults: this.noResultsText(),
      readAloud: this.readAloudLabel(),
      stepIncompleteAlert: this.translateWithFallback(
        'stepIncompleteAlert',
        'Preencha todos os itens deste passo antes de avançar.',
      ),
    };
  });

  protected readonly quickFillLabels = computed<QuickFillLabels>(() => {
    this.i18n.currentLang();
    return {
      title: this.i18n.translateUi('quickFillTitle'),
      prev: this.i18n.translateUi('quickFillPrev'),
      next: this.i18n.translateUi('quickFillNext'),
      clearKey: this.i18n.translateUi('quickFillClearKey'),
      shortcutHint: this.i18n.translateUi('quickFillShortcutHint'),
      empty: this.i18n.translateUi('quickFillEmpty'),
      close: this.i18n.translateUi('quickFillClose'),
    };
  });

  protected readonly classicHint = computed<string>(() => {
    this.i18n.currentLang();
    return this.translateWithFallback(
      'classicSheetHint',
      'Visualização clássica em blocos por categoria: clique nos círculos para marcar ou desmarcar cada escala.',
    );
  });

  protected readonly backToChecklistModesLabel = computed<string>(() => {
    this.i18n.currentLang();
    return this.translateWithFallback('backToChecklistModes', 'Voltar ao Checklist');
  });

  protected readonly finishLabel = computed<string>(() => {
    this.i18n.currentLang();
    return this.i18n.translateUi('finishAndExport');
  });

  protected readonly noResultsText = computed<string>(() => {
    this.i18n.currentLang();
    return this.i18n.translateUi('noResults');
  });

  protected readonly otherPlaceholder = computed<string>(() => {
    this.i18n.currentLang();
    return this.i18n.translateUi('otherOptionPlaceholder');
  });

  protected readonly quickNavTitle = computed<string>(() => {
    this.i18n.currentLang();
    return this.i18n.translateUi('quickNavTitle');
  });

  protected readonly loadingErrorText = computed<string>(() => {
    this.i18n.currentLang();
    return this.i18n.translateUi('loadingError');
  });

  protected readonly retryLabel = computed<string>(() => {
    this.i18n.currentLang();
    return this.i18n.translateUi('retry');
  });

  protected readonly loadingSchemaLabel = computed<string>(() => {
    this.i18n.currentLang();
    return this.i18n.translateUi('loadingSchema');
  });

  protected readonly readAloudLabel = computed<string>(() => {
    this.i18n.currentLang();
    return this.translateWithFallback('a11yReadAloudItem', 'Ouvir leitura deste item');
  });

  protected readonly autosaveStatusText = computed<string>(() => {
    const lang = this.i18n.currentLang();
    if (this.autosave.isSaving()) {
      return this.translateWithFallback(
        'autosaveSaving',
        'Salvando preenchimento criptografado...',
      );
    }

    const savedAt = this.autosave.lastAutosavedAt();
    if (!this.autosave.isEnabled()) {
      const disabledLabel = this.translateWithFallback(
        'autosaveDisabled',
        'Salvamento automático desativado',
      );
      return savedAt ? `${disabledLabel} • ${this.formatSavedTime(savedAt, lang)}` : disabledLabel;
    }

    if (savedAt) {
      const formattedTime = this.formatSavedTime(savedAt, lang);
      const prefix = this.translateWithFallback(
        'autosaveSavedAt',
        'Salvo automaticamente (criptografado) às',
      );
      return `${prefix} ${formattedTime}`;
    }

    return this.translateWithFallback(
      'autosaveActive',
      'Autosave criptografado ativo (a cada 1 min)',
    );
  });

  constructor() {
    effect(() => {
      const currentSchema = this.schema();
      this.i18n.currentLang();
      if (!currentSchema) {
        return;
      }

      const labels: Record<string, string> = {};
      for (const group of currentSchema.groups) {
        const groupTitle = this.i18n.getGroupTitle(group.id);
        for (const item of group.items) {
          labels[item.id] = `${this.i18n.getItemLabel(item.id)} ${groupTitle}`.trim();
        }
      }

      untracked(() => {
        this.checklistState.setSearchableLabels(labels);
      });
    });
  }

  ngOnInit(): void {
    this.autosave.start(this.destroyRef);
    if (this.checklistState.schema() !== null) {
      this.isLoading.set(false);
      this.loadError.set(false);
      return;
    }
    this.loadSchema();
  }

  protected loadSchema(): void {
    this.loadSubscription?.unsubscribe();
    this.isLoading.set(true);
    this.loadError.set(false);

    this.loadSubscription = this.schemaRepository
      .getChecklistSchema('v1')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (loadedSchema) => {
          this.checklistState.initializeSchema(loadedSchema);
          this.isLoading.set(false);
          this.loadError.set(false);
        },
        error: () => {
          this.loadError.set(true);
          this.isLoading.set(false);
        },
      });
  }

  protected async onSaveNow(): Promise<void> {
    const saved = await this.autosave.saveNow();
    if (saved) {
      this.accessibility.announce(
        this.translateWithFallback(
          'autosaveSavedNow',
          'Preenchimento salvo com criptografia no navegador.',
        ),
      );
    }
  }

  protected onViewModeChange(mode: ChecklistViewMode): void {
    this.checklistState.setViewMode(mode);
    this.telemetry.trackEvent('checklist_mode_selected', { mode, source: 'toolbar' });
  }

  protected onBackToModeSelector(): void {
    void this.router.navigate(APP_ROUTE_COMMANDS.checklist);
  }

  protected onSearchQueryChange(query: string): void {
    this.reviewStepActive.set(false);
    this.checklistState.setSearchQuery(query);
  }

  protected onOnlyUnansweredChange(enabled: boolean): void {
    this.reviewStepActive.set(false);
    this.checklistState.setOnlyUnanswered(enabled);
  }

  protected onActiveStepChange(stepIndex: number): void {
    const groups = this.filteredGroups();
    if (groups.length > 0 && stepIndex >= groups.length) {
      this.reviewStepActive.set(true);
      this.accessibility.announce(this.stepperLabels().reviewTitle, false);
      this.scrollToContentTop();
      return;
    }

    this.reviewStepActive.set(false);
    this.checklistState.setActiveCategory(stepIndex);
    const group = groups[stepIndex];
    if (group) {
      this.accessibility.announce(this.i18n.getGroupTitle(group.id), false);
    }
    this.scrollToContentTop();
  }

  protected onAnswerChange(event: { itemId: string; patch: Partial<ItemResponseValue> }): void {
    this.checklistState.setItemAnswer(event.itemId, event.patch);
    if (this.accessibility.audioAssistEnabled() || this.accessibility.visualCaptionsEnabled()) {
      const label = this.i18n.getItemLabel(event.itemId);
      const scaleId = event.patch.primaryScale ?? event.patch.secondaryScale;
      const valueText = scaleId ? this.i18n.getScaleLabel(scaleId) : '';
      const message = valueText.length > 0 ? `${label}: ${valueText}` : label;
      this.accessibility.announce(message);
    }
  }

  protected onReadItemAloud(item: ItemDefinition): void {
    const label = this.i18n.getItemLabel(item.id);
    const tooltip = this.i18n.getItemTooltip(item.id);
    const answer = this.answers()[item.id];
    const parts = [label];
    if (tooltip.length > 0) {
      parts.push(tooltip);
    }
    if (answer?.primaryScale) {
      parts.push(this.i18n.getScaleLabel(answer.primaryScale));
    }
    if (answer?.secondaryScale) {
      parts.push(this.i18n.getScaleLabel(answer.secondaryScale));
    }
    this.accessibility.speak(parts.join('. '), { force: true });
  }

  protected onReadTextAloud(text: string): void {
    this.accessibility.speak(text, { force: true });
  }

  protected onClearAll(): void {
    this.feedbackHost
      .confirm({
        title: this.i18n.translateUi('clearConfirmTitle'),
        message: this.i18n.translateUi('clearConfirmMessage'),
        icon: 'fa-solid fa-triangle-exclamation',
        confirmLabel: this.i18n.translateUi('confirmYes'),
        cancelLabel: this.i18n.translateUi('confirmNo'),
        danger: true,
      })
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        const clearedCount = this.checklistState.answeredItemsCount();
        this.reviewStepActive.set(false);
        this.checklistState.resetAllAnswers();
        this.autosave.clearAutosave();
        this.telemetry.trackEvent('checklist_cleared', { answeredCount: clearedCount });
        this.accessibility.announce(
          this.translateWithFallback('a11yClearedStatus', 'Todas as respostas foram limpas.'),
        );
      });
  }

  protected onAutosaveEnabledChange(enabled: boolean): void {
    this.autosave.setEnabled(enabled);
  }

  protected onFinishChecklist(): void {
    if (this.hasAnswers()) {
      void this.autosave.saveNow();
    }
    void this.router.navigate(APP_ROUTE_COMMANDS.checklistExport);
  }

  private translateWithFallback(key: string, fallback: string): string {
    const resolved = this.i18n.translateUi(key);
    return resolved === `ui.${key}` ? fallback : resolved;
  }

  private formatSavedTime(isoTimestamp: string, lang: SupportedLanguage): string {
    const parsed = new Date(isoTimestamp);
    if (Number.isNaN(parsed.getTime())) {
      return isoTimestamp;
    }
    try {
      return new Intl.DateTimeFormat(lang, {
        hour: '2-digit',
        minute: '2-digit',
      }).format(parsed);
    } catch {
      return parsed.toISOString().slice(11, 16);
    }
  }

  private scrollToContentTop(): void {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        // Ignore unimplemented window.scrollTo in non-browser DOM test environments.
      }
    }
  }
}
