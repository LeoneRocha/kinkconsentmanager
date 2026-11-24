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
import {
  AccessibilityService,
  ChecklistAutosaveService,
  ChecklistStateService,
  I18nService,
  TelemetryService,
  UiFeedbackHostService,
} from '../../../../core/services';
import { LegendBarComponent, ProgressIndicatorComponent } from '../../../../shared/components';
import { ChecklistHeaderComponent, ChecklistHeaderLabels } from '../../components/checklist-header';
import {
  ChecklistModeSelectorComponent,
  ChecklistModeSelectorLabels,
} from '../../components/checklist-mode-selector';
import { JsonDraftService } from '../../../export/services';
import {
  ChecklistStepRailComponent,
  ChecklistStepperComponent,
  ChecklistStepperLabels,
} from '../../components/checklist-stepper';
import { ClassicKinkSheetComponent } from '../../components/classic-kink-sheet';
import { FullViewContainerComponent } from '../../components/full-view-container';
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
    ProgressIndicatorComponent,
    ChecklistHeaderComponent,
    ChecklistModeSelectorComponent,
    ChecklistStepRailComponent,
    ChecklistStepperComponent,
    ClassicKinkSheetComponent,
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
  private readonly jsonDraft = inject(JsonDraftService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly contentContainer = viewChild<ElementRef<HTMLElement>>('contentContainer');
  protected readonly stepperRef = viewChild(ChecklistStepperComponent);
  private loadSubscription: Subscription | null = null;

  protected readonly isLoading = signal<boolean>(true);
  protected readonly loadError = signal<boolean>(false);
  protected readonly hasSelectedStartMode = signal<boolean>(false);
  protected readonly isImportingJson = signal<boolean>(false);
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
      progressLabel: this.i18n.translateUi('progressLabel'),
      exportButton: this.i18n.translateUi('navExport'),
      legendTitle: this.i18n.translateUi('legendTitle'),
      privacyNotice: this.i18n.translateUi('privacyNotice'),
      clearSearch: this.i18n.translateUi('clearSelection'),
      controlsSectionTitle: this.translateWithFallback(
        'headerControlsSection',
        'Visualização, Filtros e Ações',
      ),
      saveNowTooltip: this.translateWithFallback('autosaveSaveNow', 'Salvar agora (criptografado)'),
      saveButton: this.translateWithFallback('saveButton', 'Salvar'),
      autosaveToggleLabel: this.translateWithFallback(
        'autosaveToggleLabel',
        'Salvamento automático',
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
      expandAll: this.translateWithFallback('expandAllCategories', 'Expandir tudo'),
      collapseAll: this.translateWithFallback('collapseAllCategories', 'Recolher tudo'),
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

  protected readonly modeSelectorLabels = computed<ChecklistModeSelectorLabels>(() => {
    this.i18n.currentLang();
    return {
      pageTitle: this.translateWithFallback(
        'modePickerTitle',
        'Como você prefere preencher o checklist?',
      ),
      pageSubtitle: this.translateWithFallback(
        'modePickerSubtitle',
        'Escolha o formato mais confortável para o seu ritmo. Você poderá alternar de modo a qualquer momento sem perder suas respostas.',
      ),
      howToFillLabel: this.translateWithFallback('modePickerHowToFillLabel', 'Como preencher'),
      startButton: this.translateWithFallback('modePickerStartButton', 'Começar neste modo'),
      continueButton: this.translateWithFallback(
        'modePickerContinueButton',
        'Continuar neste modo',
      ),
      existingProgressLabel: this.translateWithFallback(
        'modePickerExistingProgress',
        'Progresso local encontrado',
      ),
      stepperTitle: this.translateWithFallback('stepperMode', 'Guiado (Passos)'),
      stepperBadge: this.translateWithFallback('modePickerStepperBadge', 'Recomendado'),
      stepperDesc: this.translateWithFallback(
        'modePickerStepperDesc',
        'Avance uma categoria por vez com trilha visual de etapas e validação antes de seguir.',
      ),
      stepperHowToFill: this.translateWithFallback(
        'modePickerStepperHow',
        'Responda todos os itens do passo atual, avance pelas categorias no topo ou rodapé e confira tudo na Revisão Final antes de exportar.',
      ),
      classicTitle: this.translateWithFallback('classicMode', 'Modo Clássico'),
      classicBadge: this.translateWithFallback('modePickerClassicBadge', 'Folha compacta'),
      classicDesc: this.translateWithFallback(
        'modePickerClassicDesc',
        'Visual tradicional em blocos por categoria com círculos coloridos lado a lado.',
      ),
      classicHowToFill: this.translateWithFallback(
        'modePickerClassicHow',
        'Clique diretamente nos círculos coloridos (Dar / Receber ou escala geral) para marcar ou desmarcar rapidamente cada prática.',
      ),
      fullTitle: this.i18n.translateUi('fullMode'),
      fullBadge: this.translateWithFallback('modePickerFullBadge', 'Página única'),
      fullDesc: this.translateWithFallback(
        'modePickerFullDesc',
        'Todas as categorias e práticas expandidas em uma única página com navegação rápida.',
      ),
      fullHowToFill: this.translateWithFallback(
        'modePickerFullHow',
        'Role livremente pela lista completa ou pule direto para qualquer categoria usando os atalhos no topo.',
      ),
      quickFillTitle: this.i18n.translateUi('quickFillButton'),
      quickFillBadge: this.translateWithFallback('modePickerQuickFillBadge', 'Atalhos 1–5'),
      quickFillDesc: this.translateWithFallback(
        'modePickerQuickFillDesc',
        'Fluxo focado em um item por vez para preencher o checklist em poucos minutos.',
      ),
      quickFillHowToFill: this.translateWithFallback(
        'modePickerQuickFillHow',
        'Use as teclas 1 a 5 (ou clique nas opções) para escolher a escala e avançar automaticamente; pressione 0 para limpar ou ↑/↓ para navegar.',
      ),
      importTitle: this.translateWithFallback(
        'modePickerImportTitle',
        'Já tem um preenchimento salvo em JSON?',
      ),
      importDesc: this.translateWithFallback(
        'modePickerImportDesc',
        'Importe um arquivo .json exportado anteriormente para restaurar suas respostas e continuar editando ou exportar novamente.',
      ),
      importButton: this.translateWithFallback('modePickerImportButton', 'Importar JSON'),
    };
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

  protected onStartModeSelected(mode: ChecklistViewMode): void {
    this.reviewStepActive.set(false);
    this.checklistState.setViewMode(mode);
    this.hasSelectedStartMode.set(true);
    this.telemetry.trackEvent('checklist_mode_selected', { mode, source: 'mode_selector' });
    this.scrollToContentTop();
  }

  protected async onImportJsonFile(file: File): Promise<void> {
    const activeSchema = this.schema();
    if (!activeSchema || this.isImportingJson()) {
      return;
    }

    this.isImportingJson.set(true);
    const importTitle = this.translateWithFallback('importJson', 'Importar JSON');
    try {
      const rawContent = await this.readFileAsText(file);
      const validation = this.jsonDraft.parseAndValidateDraft(
        rawContent,
        activeSchema.schemaVersion,
      );

      if (validation.valid && validation.draft) {
        this.reviewStepActive.set(false);
        this.checklistState.importDraft(validation.draft);
        void this.autosave.saveNow();
        this.hasSelectedStartMode.set(true);
        this.scrollToContentTop();
        this.telemetry.trackEvent('checklist_json_imported', {
          source: 'mode_selector',
          status: 'success',
        });
        this.feedbackHost.success(
          `${importTitle} — ${this.translateWithFallback(
            'importSuccess',
            'Rascunho JSON importado e restaurado com sucesso.',
          )}`,
          {
            actionLabel: this.translateWithFallback('notificationOkAction', 'OK'),
            duration: 4000,
          },
        );
        return;
      }

      const isIncompatibleVersion = validation.errors.some((error) =>
        error.toLowerCase().includes('incompatible'),
      );
      this.telemetry.trackEvent('checklist_json_imported', {
        source: 'mode_selector',
        status: 'error',
      });
      this.feedbackHost.error(
        `${importTitle} — ${isIncompatibleVersion
          ? this.translateWithFallback(
            'importErrorIncompatibleVersion',
            'Versão do schema incompatível com este checklist.',
          )
          : this.translateWithFallback(
            'importErrorInvalidJson',
            'Arquivo inválido: não foi possível ler um rascunho JSON válido.',
          )
        }`,
        {
          actionLabel: this.translateWithFallback('notificationOkAction', 'OK'),
          duration: 5000,
        },
      );
    } catch {
      this.feedbackHost.error(
        `${importTitle} — ${this.translateWithFallback(
          'importErrorInvalidJson',
          'Arquivo inválido: não foi possível ler um rascunho JSON válido.',
        )}`,
        {
          actionLabel: this.translateWithFallback('notificationOkAction', 'OK'),
          duration: 5000,
        },
      );
    } finally {
      this.isImportingJson.set(false);
    }
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
    void this.router.navigate(['/export']);
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

  private readFileAsText(file: File): Promise<string> {
    if (typeof file.text === 'function') {
      return file.text();
    }

    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(typeof reader.result === 'string' ? reader.result : '');
      };
      reader.onerror = () => {
        reject(reader.error ?? new Error('Failed to read selected file.'));
      };
      reader.readAsText(file, 'utf-8');
    });
  }
}
