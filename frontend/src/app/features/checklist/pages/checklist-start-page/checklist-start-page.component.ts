import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChecklistViewMode } from '../../../../core/models';
import { SCHEMA_REPOSITORY_TOKEN } from '../../../../core/repositories';
import { APP_ROUTE_COMMANDS } from '../../../../core/routes';
import {
  ChecklistAutosaveService,
  ChecklistStateService,
  DraftImportWorkerService,
  I18nService,
  TelemetryService,
  UiFeedbackHostService,
} from '../../../../core/services';
import {
  ChecklistModeSelectorComponent,
  ChecklistModeSelectorLabels,
} from '../../components/checklist-mode-selector';

/**
 * Rota `/checklist`: tela inicial do formulário onde o usuário escolhe o modo de preenchimento
 * ou importa um rascunho JSON antes de seguir para `/checklist/fill`.
 */
@Component({
  selector: 'app-checklist-start-page',
  imports: [MatButtonModule, ChecklistModeSelectorComponent],
  templateUrl: './checklist-start-page.component.html',
  styleUrl: './checklist-start-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistStartPageComponent implements OnInit {
  private readonly schemaRepository = inject(SCHEMA_REPOSITORY_TOKEN);
  protected readonly checklistState = inject(ChecklistStateService);
  private readonly autosave = inject(ChecklistAutosaveService);
  private readonly draftImportWorker = inject(DraftImportWorkerService);
  private readonly i18n = inject(I18nService);
  private readonly feedbackHost = inject(UiFeedbackHostService);
  private readonly telemetry = inject(TelemetryService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private loadSubscription: Subscription | null = null;

  protected readonly isLoading = signal<boolean>(true);
  protected readonly loadError = signal<boolean>(false);
  protected readonly isImportingJson = signal<boolean>(false);

  protected readonly schema = this.checklistState.schema;
  protected readonly answeredCount = this.checklistState.answeredItemsCount;
  protected readonly totalCount = this.checklistState.totalItemsCount;
  protected readonly progressPercentage = this.checklistState.progressPercentage;

  protected readonly loadingSchemaLabel = computed<string>(() => {
    this.i18n.currentLang();
    return this.i18n.translateUi('loadingSchema');
  });

  protected readonly loadingErrorText = computed<string>(() => {
    this.i18n.currentLang();
    return this.i18n.translateUi('loadingError');
  });

  protected readonly retryLabel = computed<string>(() => {
    this.i18n.currentLang();
    return this.i18n.translateUi('retry');
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
      stepperBadge: this.translateWithFallback('modePickerStepperBadge', 'Por etapas'),
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
      quickFillBadge: this.translateWithFallback('modePickerQuickFillBadge', 'Recomendado'),
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

  protected onStartModeSelected(mode: ChecklistViewMode): void {
    this.checklistState.confirmStartMode(mode);
    this.telemetry.trackEvent('checklist_mode_selected', { mode, source: 'mode_selector' });
    void this.router.navigate(APP_ROUTE_COMMANDS.checklistFill);
  }

  protected async onImportJsonFile(file: File): Promise<void> {
    const activeSchema = this.schema();
    if (!activeSchema || this.isImportingJson()) {
      return;
    }

    this.isImportingJson.set(true);
    const importTitle = this.translateWithFallback('importJson', 'Importar JSON');
    try {
      const outcome = await this.draftImportWorker.importDraftFile(
        file,
        activeSchema.schemaVersion,
      );
      const validation = outcome.validation;

      if (validation.valid && validation.draft) {
        this.checklistState.importDraft(validation.draft);
        this.checklistState.confirmStartMode();
        void this.autosave.saveNow();
        this.telemetry.trackEvent('checklist_json_imported', {
          source: 'mode_selector',
          status: 'success',
          processed_in_worker: String(outcome.processedInWorker),
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
        void this.router.navigate(APP_ROUTE_COMMANDS.checklistFill);
        return;
      }

      const isIncompatibleVersion = validation.errors.some((error) =>
        error.toLowerCase().includes('incompatible'),
      );
      this.telemetry.trackEvent('checklist_json_imported', {
        source: 'mode_selector',
        status: 'error',
        processed_in_worker: String(outcome.processedInWorker),
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

  private translateWithFallback(key: string, fallback: string): string {
    const resolved = this.i18n.translateUi(key);
    return resolved === `ui.${key}` ? fallback : resolved;
  }
}
