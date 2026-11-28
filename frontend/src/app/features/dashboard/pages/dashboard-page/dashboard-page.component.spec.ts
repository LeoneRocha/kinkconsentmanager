import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { AuthUser, ChecklistSchema, LoginResponse } from '../../../../core/models';
import { SCHEMA_REPOSITORY_TOKEN } from '../../../../core/repositories';
import {
  API_BASE_URL,
  ChecklistStateService,
  UiFeedbackHostService,
} from '../../../../core/services';
import { DashboardPageComponent } from './dashboard-page.component';

const MOCK_SCHEMA: ChecklistSchema = {
  schemaVersion: '1.0.0',
  scales: [
    { id: 'enjoy', order: 1, color: '#388E3C', contrastColor: '#FFFFFF', icon: 'pi pi-check' },
  ],
  groups: [
    {
      id: 'grp_bondage',
      order: 1,
      defaultDualRole: true,
      rolePairId: 'giving_receiving',
      items: [
        { id: 'item_rope', type: 'scale_matrix' },
        { id: 'item_cuffs', type: 'scale_matrix' },
      ],
    },
  ],
};

const MOCK_AUTH_USER: AuthUser = {
  id: 2,
  login: 'user.kink',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  lastLoginAt: null,
};

describe('DashboardPageComponent', () => {
  let fixture: ComponentFixture<DashboardPageComponent>;
  let checklistState: ChecklistStateService;
  let router: Router;
  let httpMock: HttpTestingController;
  let feedbackMock: jest.Mocked<Pick<UiFeedbackHostService, 'success' | 'error'>>;
  let getChecklistSchemaMock: jest.Mock<Observable<ChecklistSchema>, [version?: string]>;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();

    getChecklistSchemaMock = jest.fn(() => of(MOCK_SCHEMA));
    feedbackMock = {
      success: jest.fn(),
      error: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' }),
        { provide: API_BASE_URL, useValue: 'https://api.example.test' },
        {
          provide: SCHEMA_REPOSITORY_TOKEN,
          useValue: { getChecklistSchema: getChecklistSchemaMock },
        },
        {
          provide: UiFeedbackHostService,
          useValue: feedbackMock,
        },
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', {
      ui: {
        dashboardTitle: 'Painel Inicial',
        dashboardSubtitle: 'Escolha uma ferramenta.',
        dashboardSectionTitle: 'Ferramentas',
        dashboardStatusAvailable: 'Disponível',
        dashboardChecklistTitle: 'Checklist de Limites e Consentimento',
        dashboardChecklistDesc: 'Descrição do checklist.',
        dashboardChecklistCtaStart: 'Abrir Checklist',
        dashboardChecklistCtaContinue: 'Continuar Checklist',
        authCloudBadge: 'Recursos em Nuvem',
        authCloudTitle: 'Faça login para desbloquear recursos na nuvem',
        authCloudSubtitle: 'Sincronize seus dados.',
        authBenefitCloudSave: 'Salvar na nuvem',
        authBenefitShare: 'Compartilhar com parceiros',
        authBenefitMoreCloud: 'Mais recursos em nuvem',
        authComingSoonBadge: 'Em breve',
        authCloudAdvanceCta: 'Avançar para login',
        authCloudSignedInTitle: 'Conta conectada à nuvem',
        authCloudSignedInDesc: 'Sessão ativa.',
        authLogoutButton: 'Sair da conta',
        authLoginTitle: 'Entrar na sua conta',
        authLoginSubtitle: 'Informe seus dados.',
        authBackToBenefits: 'Voltar',
        authLoginIdentifierLabel: 'Login ou E-mail',
        authLoginIdentifierPlaceholder: 'seu.login',
        authPasswordLabel: 'Senha',
        authPasswordPlaceholder: 'Digite sua senha',
        authShowPassword: 'Mostrar senha',
        authHidePassword: 'Ocultar senha',
        authLoginSubmit: 'Entrar',
        authLoginSubmitting: 'Entrando...',
        authNoAccountPrompt: 'Não tem cadastro?',
        authNoAccountCta: 'Clique aqui',
        authRegisterTitle: 'Criar nova conta',
        authRegisterSubtitle: 'Cadastre seus dados.',
        authRegisterLoginLabel: 'Login',
        authRegisterLoginPlaceholder: 'seu.login',
        authRegisterEmailLabel: 'E-mail',
        authRegisterEmailPlaceholder: 'voce@exemplo.com',
        authRegisterPrivacyTitle: 'Sua privacidade vem em primeiro lugar',
        authRegisterPrivacyNotice: 'Não salvamos seu e-mail no banco pela LGPD.',
        authConfirmPasswordLabel: 'Confirmar senha',
        authConfirmPasswordPlaceholder: 'Repita sua senha',
        authPasswordHint: '8+ caracteres.',
        authRegisterSubmit: 'Criar conta',
        authRegisterSubmitting: 'Cadastrando...',
        authHaveAccountPrompt: 'Já tem cadastro?',
        authHaveAccountCta: 'Fazer login',
        authValidationRequired: 'Campo obrigatório.',
        authValidationLoginFormat: 'Login inválido.',
        authValidationEmailInvalid: 'E-mail inválido.',
        authValidationPasswordPolicy: 'Senha fraca.',
        authValidationPasswordMismatch: 'As senhas não conferem.',
        authLoginSuccess: 'Login realizado com sucesso!',
        authRegisterSuccess: 'Cadastro concluído!',
        authLogoutSuccess: 'Sessão encerrada.',
        authErrorLoginFailed: 'Erro no login.',
        authErrorRegisterFailed: 'Erro no cadastro.',
      },
    });
    translate.use('pt-BR');

    checklistState = TestBed.inject(ChecklistStateService);
    router = TestBed.inject(Router);
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DashboardPageComponent);
    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
    jest.restoreAllMocks();
  });

  // Cenário: Exibição do Dashboard inicial com cartão do Checklist sem progresso salvo e com progresso local.
  // Objetivo: Garantir carregamento inicial do schema para contagem, exibição do cartão funcional e badge de progresso quando houver respostas.
  it('should render Checklist feature card and update badge/CTA when local progress exists', async () => {
    const hostEl = fixture.nativeElement as HTMLElement;
    const card = hostEl.querySelector<HTMLButtonElement>('button[data-feature-id="checklist"]')!;
    expect(card).not.toBeNull();
    expect(card.textContent).toContain('Checklist de Limites e Consentimento');
    expect(card.textContent).toContain('Abrir Checklist');
    expect(card.querySelector('.dashboard__progress-badge')).toBeNull();

    checklistState.setItemAnswer('item_rope', { primaryScale: 'enjoy' });
    await fixture.whenStable();

    expect(card.textContent).toContain('Continuar Checklist');
    expect(card.querySelector('.dashboard__progress-badge')?.textContent).toContain('1 / 2 (50%)');
  });

  // Cenário: Clique do usuário no cartão do Checklist no Dashboard.
  // Objetivo: Navegar para a rota `/checklist` para escolha do modo de preenchimento.
  it('should navigate to /checklist when the Checklist card is clicked', () => {
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    const hostEl = fixture.nativeElement as HTMLElement;

    hostEl.querySelector<HTMLButtonElement>('button[data-feature-id="checklist"]')?.click();

    expect(navigateSpy).toHaveBeenCalledWith(['/checklist']);
  });

  // Cenário: Fluxo completo na área de nuvem do Dashboard (Promo -> Login -> Cadastro -> Login -> Conectado -> Logout).
  // Objetivo: Garantir alternância entre os 3 componentes desacoplados e integração HTTP completa com AuthService.
  it('should transition between cloud promo, register, login, connected state, and logout', async () => {
    // Arrange
    const hostEl = fixture.nativeElement as HTMLElement;

    // 1. Promo -> Login
    hostEl.querySelector<HTMLButtonElement>('[data-testid="cloud-advance-login-btn"]')!.click();
    await fixture.whenStable();
    expect(hostEl.querySelector('app-auth-login-form')).not.toBeNull();

    // 2. Login -> Cadastro ("Não tem cadastro? Clique aqui")
    hostEl.querySelector<HTMLButtonElement>('[data-testid="auth-switch-to-register-btn"]')!.click();
    await fixture.whenStable();
    expect(hostEl.querySelector('app-auth-register-form')).not.toBeNull();

    // 3. Preencher e enviar cadastro
    const regLogin = hostEl.querySelector<HTMLInputElement>('#kcm-register-login')!;
    const regEmail = hostEl.querySelector<HTMLInputElement>('#kcm-register-email')!;
    const regPass = hostEl.querySelector<HTMLInputElement>('#kcm-register-password')!;
    const regConfirm = hostEl.querySelector<HTMLInputElement>('#kcm-register-confirm-password')!;

    regLogin.value = 'user.kink';
    regLogin.dispatchEvent(new Event('input'));
    regEmail.value = 'user.kink@kinkconsentmanager.local';
    regEmail.dispatchEvent(new Event('input'));
    regPass.value = 'Strong@123';
    regPass.dispatchEvent(new Event('input'));
    regConfirm.value = 'Strong@123';
    regConfirm.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    hostEl.querySelector('app-auth-register-form form')!.dispatchEvent(new Event('submit'));
    const registerReq = httpMock.expectOne('https://api.example.test/api/v1/auth/register');
    registerReq.flush({ isSuccess: true, statusCode: 201, data: MOCK_AUTH_USER });
    await fixture.whenStable();

    // Deve voltar ao login com login pré-preenchido e toast de sucesso
    expect(feedbackMock.success).toHaveBeenCalledWith('Cadastro concluído!');
    expect(hostEl.querySelector('app-auth-login-form')).not.toBeNull();
    const loginIdentifier = hostEl.querySelector<HTMLInputElement>('#kcm-login-identifier')!;
    expect(loginIdentifier.value).toBe('user.kink');

    // 4. Fazer login
    const loginPassword = hostEl.querySelector<HTMLInputElement>('#kcm-login-password')!;
    loginPassword.value = 'Strong@123';
    loginPassword.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    const futureExpiry = new Date(Date.now() + 3600_000).toISOString();
    const loginPayload: LoginResponse = {
      accessToken: 'jwt-token-xyz',
      refreshToken: 'refresh-xyz',
      expiresAtUtc: futureExpiry,
      refreshTokenExpiresAtUtc: futureExpiry,
      user: MOCK_AUTH_USER,
    };

    hostEl.querySelector('app-auth-login-form form')!.dispatchEvent(new Event('submit'));
    const loginReq = httpMock.expectOne('https://api.example.test/api/v1/auth/login');
    loginReq.flush({ isSuccess: true, statusCode: 200, data: loginPayload });
    await fixture.whenStable();

    // Após o login, Dashboard dispara sincronização on-line da nuvem
    const cloudSyncReq = httpMock.expectOne('https://api.example.test/api/v1/checklists/current');
    expect(cloudSyncReq.request.method).toBe('GET');
    cloudSyncReq.flush({
      isSuccess: true,
      statusCode: 200,
      data: {
        id: 1,
        schemaVersion: '1.0.0',
        language: 'pt-BR',
        answersJson: '{"item_rope":{"primaryScale":"enjoy"}}',
        clientUpdatedAtUtc: '2026-11-27T16:00:00.000Z',
        version: 1,
        createdAt: '2026-11-27T16:00:00.000Z',
        updatedAt: '2026-11-27T16:00:00.000Z',
      },
    });
    await Promise.resolve();
    await Promise.resolve();
    await fixture.whenStable();

    // Deve exibir o banner conectado com dados do usuário e atualizar o card para Continuar Checklist
    expect(feedbackMock.success).toHaveBeenCalledWith('Login realizado com sucesso!');
    expect(hostEl.querySelector('app-cloud-benefits-banner')).not.toBeNull();
    expect(hostEl.textContent).toContain('@user.kink');
    expect(hostEl.querySelector('button[data-feature-id="checklist"]')?.textContent).toContain(
      'Continuar Checklist',
    );

    // 5. Logout
    hostEl.querySelector<HTMLButtonElement>('.cloud-banner__ghost-btn')!.click();
    const logoutReq = httpMock.expectOne('https://api.example.test/api/v1/auth/logout');
    logoutReq.flush({ isSuccess: true, statusCode: 200, data: true });
    await fixture.whenStable();

    expect(feedbackMock.success).toHaveBeenCalledWith('Sessão encerrada.');
    expect(hostEl.querySelector('[data-testid="cloud-advance-login-btn"]')).not.toBeNull();
    expect(checklistState.answers()).toEqual({});
    expect(hostEl.querySelector('button[data-feature-id="checklist"]')?.textContent).toContain(
      'Abrir Checklist',
    );
  });
});
