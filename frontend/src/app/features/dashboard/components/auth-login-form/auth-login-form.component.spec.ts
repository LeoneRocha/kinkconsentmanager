import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { AuthLoginFormComponent } from './auth-login-form.component';

describe('AuthLoginFormComponent', () => {
  let fixture: ComponentFixture<AuthLoginFormComponent>;
  let component: AuthLoginFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthLoginFormComponent],
      providers: [provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' })],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', {
      ui: {
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
        authValidationRequired: 'Campo obrigatório.',
      },
    });
    translate.use('pt-BR');

    fixture = TestBed.createComponent(AuthLoginFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Cenário: Preenchimento válido e submissão do formulário de login.
  // Objetivo: Garantir emissão de payload normalizado e alternância de visibilidade de senha.
  it('should emit submitted payload when form is valid and toggle password visibility', async () => {
    // Arrange
    const submitSpy = jest.spyOn(component.submitted, 'emit');
    const hostEl = fixture.nativeElement as HTMLElement;
    const identifierInput = hostEl.querySelector<HTMLInputElement>('#kcm-login-identifier')!;
    const passwordInput = hostEl.querySelector<HTMLInputElement>('#kcm-login-password')!;
    const toggleBtn = hostEl.querySelector<HTMLButtonElement>('.auth-card__toggle-btn')!;

    expect(passwordInput.type).toBe('password');
    toggleBtn.click();
    await fixture.whenStable();
    expect(passwordInput.type).toBe('text');

    // Act
    identifierInput.value = ' user.kink ';
    identifierInput.dispatchEvent(new Event('input'));
    passwordInput.value = 'Strong@123';
    passwordInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    const submitBtn = hostEl.querySelector<HTMLButtonElement>(
      '[data-testid="auth-login-submit-btn"]',
    )!;
    expect(submitBtn.disabled).toBe(false);
    hostEl.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    // Assert
    expect(submitSpy).toHaveBeenCalledWith({
      loginOrEmail: 'user.kink',
      password: 'Strong@123',
    });
  });

  // Cenário: Clique nos botões de cadastro e voltar, além de exibição de erro externo.
  // Objetivo: Garantir emissão de switchToRegister e backRequested e renderização de role="alert".
  it('should emit switchToRegister, backRequested, and display API error alert', async () => {
    // Arrange
    fixture.componentRef.setInput('errorMessage', 'Credenciais inválidas.');
    await fixture.whenStable();

    const switchSpy = jest.spyOn(component.switchToRegister, 'emit');
    const backSpy = jest.spyOn(component.backRequested, 'emit');
    const hostEl = fixture.nativeElement as HTMLElement;

    // Act
    hostEl.querySelector<HTMLButtonElement>('[data-testid="auth-switch-to-register-btn"]')!.click();
    hostEl.querySelector<HTMLButtonElement>('[data-testid="auth-login-back-btn"]')!.click();

    // Assert
    expect(hostEl.querySelector('[role="alert"]')?.textContent).toContain('Credenciais inválidas.');
    expect(switchSpy).toHaveBeenCalledTimes(1);
    expect(backSpy).toHaveBeenCalledTimes(1);
  });
});
