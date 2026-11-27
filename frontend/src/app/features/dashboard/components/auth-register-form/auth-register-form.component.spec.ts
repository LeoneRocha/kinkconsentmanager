import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { AuthRegisterFormComponent } from './auth-register-form.component';

describe('AuthRegisterFormComponent', () => {
  let fixture: ComponentFixture<AuthRegisterFormComponent>;
  let component: AuthRegisterFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthRegisterFormComponent],
      providers: [provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' })],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', {
      ui: {
        authRegisterTitle: 'Criar nova conta',
        authRegisterSubtitle: 'Cadastre seus dados.',
        authBackToBenefits: 'Voltar',
        authRegisterLoginLabel: 'Login',
        authRegisterLoginPlaceholder: 'seu.login',
        authRegisterEmailLabel: 'E-mail',
        authRegisterEmailPlaceholder: 'voce@exemplo.com',
        authRegisterPrivacyTitle: 'Sua privacidade vem em primeiro lugar',
        authRegisterPrivacyNotice: 'Não salvamos seu e-mail no banco pela LGPD.',
        authPasswordLabel: 'Senha',
        authPasswordPlaceholder: 'Digite sua senha',
        authConfirmPasswordLabel: 'Confirmar senha',
        authConfirmPasswordPlaceholder: 'Repita sua senha',
        authShowPassword: 'Mostrar senha',
        authHidePassword: 'Ocultar senha',
        authPasswordHint: '8+ caracteres fortes.',
        authRegisterSubmit: 'Criar conta',
        authRegisterSubmitting: 'Cadastrando...',
        authHaveAccountPrompt: 'Já tem cadastro?',
        authHaveAccountCta: 'Fazer login',
        authValidationRequired: 'Campo obrigatório.',
        authValidationLoginFormat: 'Formato de login inválido.',
        authValidationEmailInvalid: 'E-mail inválido.',
        authValidationPasswordPolicy: 'Senha fraca.',
        authValidationPasswordMismatch: 'As senhas não conferem.',
      },
    });
    translate.use('pt-BR');

    fixture = TestBed.createComponent(AuthRegisterFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Cenário: Preenchimento válido e submissão do formulário de cadastro.
  // Objetivo: Validar políticas de login/e-mail/senha/confirmação e emissão de RegisterRequest.
  it('should emit RegisterRequest when all fields satisfy validation rules', async () => {
    // Arrange
    const submitSpy = jest.spyOn(component.submitted, 'emit');
    const hostEl = fixture.nativeElement as HTMLElement;

    const loginInput = hostEl.querySelector<HTMLInputElement>('#kcm-register-login')!;
    const emailInput = hostEl.querySelector<HTMLInputElement>('#kcm-register-email')!;
    const passInput = hostEl.querySelector<HTMLInputElement>('#kcm-register-password')!;
    const confirmInput = hostEl.querySelector<HTMLInputElement>('#kcm-register-confirm-password')!;

    // Act
    loginInput.value = 'new.user';
    loginInput.dispatchEvent(new Event('input'));
    emailInput.value = 'new.user@example.com';
    emailInput.dispatchEvent(new Event('input'));
    passInput.value = 'Strong@123';
    passInput.dispatchEvent(new Event('input'));
    confirmInput.value = 'Strong@123';
    confirmInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    const submitBtn = hostEl.querySelector<HTMLButtonElement>(
      '[data-testid="auth-register-submit-btn"]',
    )!;
    expect(submitBtn.disabled).toBe(false);
    hostEl.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    // Assert
    expect(
      hostEl.querySelector('[data-testid="auth-register-privacy-notice"]')?.textContent,
    ).toContain('LGPD');
    expect(submitSpy).toHaveBeenCalledWith({
      login: 'new.user',
      email: 'new.user@example.com',
      password: 'Strong@123',
      confirmPassword: 'Strong@123',
    });
  });

  // Cenário: Divergência entre senha e confirmação e clique nos links de navegação.
  // Objetivo: Bloquear envio quando as senhas não conferem e emitir switchToLogin/backRequested.
  it('should reject mismatched passwords and emit switchToLogin / backRequested', async () => {
    // Arrange
    const switchSpy = jest.spyOn(component.switchToLogin, 'emit');
    const backSpy = jest.spyOn(component.backRequested, 'emit');
    const hostEl = fixture.nativeElement as HTMLElement;

    const passInput = hostEl.querySelector<HTMLInputElement>('#kcm-register-password')!;
    const confirmInput = hostEl.querySelector<HTMLInputElement>('#kcm-register-confirm-password')!;

    passInput.value = 'Strong@123';
    passInput.dispatchEvent(new Event('input'));
    confirmInput.value = 'Other@123';
    confirmInput.dispatchEvent(new Event('input'));
    confirmInput.dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    // Act
    const submitBtn = hostEl.querySelector<HTMLButtonElement>(
      '[data-testid="auth-register-submit-btn"]',
    )!;
    hostEl.querySelector<HTMLButtonElement>('[data-testid="auth-switch-to-login-btn"]')!.click();
    hostEl.querySelector<HTMLButtonElement>('[data-testid="auth-register-back-btn"]')!.click();

    // Assert
    expect(submitBtn.disabled).toBe(true);
    expect(switchSpy).toHaveBeenCalledTimes(1);
    expect(backSpy).toHaveBeenCalledTimes(1);
  });
});
