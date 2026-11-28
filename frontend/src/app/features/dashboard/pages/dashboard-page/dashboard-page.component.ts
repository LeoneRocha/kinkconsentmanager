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
import { Router } from '@angular/router';
import { take } from 'rxjs';
import { AuthPanelView, LoginRequest, RegisterRequest } from '../../../../core/models';
import { SCHEMA_REPOSITORY_TOKEN } from '../../../../core/repositories';
import { APP_ROUTE_COMMANDS } from '../../../../core/routes';
import {
  AuthService,
  ChecklistAutosaveService,
  ChecklistStateService,
  I18nService,
  TelemetryService,
  UiFeedbackHostService,
} from '../../../../core/services';
import {
  AuthLoginFormComponent,
  AuthRegisterFormComponent,
  CloudBenefitsBannerComponent,
} from '../../components';

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
 * Página inicial (Dashboard) exibindo o painel de benefícios/autenticação em nuvem e as ferramentas disponíveis.
 */
@Component({
  selector: 'app-dashboard-page',
  imports: [CloudBenefitsBannerComponent, AuthLoginFormComponent, AuthRegisterFormComponent],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent implements OnInit {
  private readonly checklistState = inject(ChecklistStateService);
  private readonly autosave = inject(ChecklistAutosaveService);
  private readonly schemaRepository = inject(SCHEMA_REPOSITORY_TOKEN);
  private readonly authService = inject(AuthService);
  private readonly feedback = inject(UiFeedbackHostService);
  private readonly i18n = inject(I18nService);
  private readonly telemetry = inject(TelemetryService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly answeredCount = this.checklistState.answeredItemsCount;
  protected readonly totalCount = this.checklistState.totalItemsCount;
  protected readonly progressPercentage = this.checklistState.progressPercentage;

  protected readonly currentUser = this.authService.user;
  protected readonly isAuthLoading = this.authService.isLoading;
  protected readonly authError = this.authService.errorMessage;
  protected readonly authView = signal<AuthPanelView>('promo');
  protected readonly prefillLogin = signal<string>('');

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

  protected readonly cloudSectionTitle = computed<string>(() => {
    this.i18n.currentLang();
    return this.translateWithFallback('authCloudBadge', 'Salvar On-line');
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

  protected openLoginForm(): void {
    this.authService.clearError();
    this.authView.set('login');
  }

  protected openRegisterForm(): void {
    this.authService.clearError();
    this.authView.set('register');
  }

  protected backToPromo(): void {
    this.authService.clearError();
    this.authView.set('promo');
  }

  protected handleLogin(payload: LoginRequest): void {
    this.authService
      .login(payload)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.feedback.success(this.i18n.translateUi('authLoginSuccess'));
          this.authView.set('promo');
          void this.autosave.syncOnSessionStarted();
        },
        error: () => undefined,
      });
  }

  protected handleRegister(payload: RegisterRequest): void {
    this.authService
      .register(payload)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (createdUser) => {
          this.prefillLogin.set(createdUser.login);
          this.feedback.success(this.i18n.translateUi('authRegisterSuccess'));
          this.authView.set('login');
        },
        error: () => undefined,
      });
  }

  protected handleLogout(): void {
    this.authService
      .logout()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.autosave.handleLogoutCleanup();
          this.feedback.success(this.i18n.translateUi('authLogoutSuccess'));
          this.authView.set('promo');
        },
      });
  }

  private translateWithFallback(key: string, fallback: string): string {
    const resolved = this.i18n.translateUi(key);
    return resolved === `ui.${key}` ? fallback : resolved;
  }
}
