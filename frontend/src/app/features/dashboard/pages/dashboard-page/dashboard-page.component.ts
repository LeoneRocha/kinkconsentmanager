import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { take } from 'rxjs';
import { SCHEMA_REPOSITORY_TOKEN } from '../../../../core/repositories';
import { APP_ROUTE_COMMANDS } from '../../../../core/routes';
import {
  ChecklistAutosaveService,
  ChecklistStateService,
  I18nService,
  TelemetryService,
} from '../../../../core/services';

export interface DashboardFeatureCard {
  readonly id: string;
  readonly route: readonly string[];
  readonly icon: string;
  readonly statusLabel: string;
  readonly title: string;
  readonly description: string;
  readonly ctaLabel: string;
  readonly badgeText?: string;
}

/**
 * Página inicial (Dashboard) exibindo os cartões de funcionalidades disponíveis do aplicativo.
 */
@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent implements OnInit {
  private readonly checklistState = inject(ChecklistStateService);
  private readonly autosave = inject(ChecklistAutosaveService);
  private readonly schemaRepository = inject(SCHEMA_REPOSITORY_TOKEN);
  private readonly i18n = inject(I18nService);
  private readonly telemetry = inject(TelemetryService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly answeredCount = this.checklistState.answeredItemsCount;
  protected readonly totalCount = this.checklistState.totalItemsCount;
  protected readonly progressPercentage = this.checklistState.progressPercentage;

  protected readonly pageTitle = computed<string>(() => {
    this.i18n.currentLang();
    return this.translateWithFallback('dashboardTitle', 'Painel Inicial');
  });

  protected readonly pageSubtitle = computed<string>(() => {
    this.i18n.currentLang();
    return this.translateWithFallback(
      'dashboardSubtitle',
      'Escolha uma ferramenta abaixo para começar. Todos os seus dados permanecem 100% privados no seu navegador.',
    );
  });

  protected readonly sectionTitle = computed<string>(() => {
    this.i18n.currentLang();
    return this.translateWithFallback('dashboardSectionTitle', 'Ferramentas');
  });

  protected readonly featureCards = computed<readonly DashboardFeatureCard[]>(() => {
    this.i18n.currentLang();
    const answered = this.answeredCount();
    const total = this.totalCount();
    const pct = this.progressPercentage();
    const hasProgress = answered > 0 && total > 0;

    return [
      {
        id: 'checklist',
        route: APP_ROUTE_COMMANDS.checklist,
        icon: 'fa-solid fa-clipboard-check',
        statusLabel: this.translateWithFallback('dashboardStatusAvailable', 'Disponível'),
        title: this.translateWithFallback(
          'dashboardChecklistTitle',
          'Checklist de Limites e Consentimento',
        ),
        description: this.translateWithFallback(
          'dashboardChecklistDesc',
          'Preencha práticas, limites e preferências no seu ritmo (Guiado, Clássico, Visão Completa ou Preenchimento Rápido) e exporte em PNG, PDF, XLSX, CSV ou JSON.',
        ),
        ctaLabel: hasProgress
          ? this.translateWithFallback('dashboardChecklistCtaContinue', 'Continuar Checklist')
          : this.translateWithFallback('dashboardChecklistCtaStart', 'Abrir Checklist'),
        ...(hasProgress ? { badgeText: `${answered} / ${total} (${pct}%)` } : {}),
      },
    ];
  });

  ngOnInit(): void {
    void this.autosave.restoreFromAutosave();
    if (this.checklistState.schema() === null) {
      this.schemaRepository
        .getChecklistSchema('v1')
        .pipe(take(1), takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (loadedSchema) => {
            this.checklistState.initializeSchema(loadedSchema);
          },
          error: () => undefined,
        });
    }
  }

  protected openFeature(card: DashboardFeatureCard): void {
    this.telemetry.trackEvent('dashboard_feature_opened', { feature: card.id });
    void this.router.navigate(card.route);
  }

  private translateWithFallback(key: string, fallback: string): string {
    const resolved = this.i18n.translateUi(key);
    return resolved === `ui.${key}` ? fallback : resolved;
  }
}
