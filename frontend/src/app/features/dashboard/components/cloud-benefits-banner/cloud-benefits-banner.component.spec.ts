import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { AuthUser } from '../../../../core/models';
import { CloudBenefitsBannerComponent } from './cloud-benefits-banner.component';

const MOCK_USER: AuthUser = {
  id: 7,
  name: 'Alex Silva',
  login: 'alex.silva',
  email: 'alex@example.com',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  lastLoginAt: null,
};

describe('CloudBenefitsBannerComponent', () => {
  let fixture: ComponentFixture<CloudBenefitsBannerComponent>;
  let component: CloudBenefitsBannerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CloudBenefitsBannerComponent],
      providers: [provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' })],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', {
      ui: {
        authCloudBadge: 'Recursos em Nuvem',
        authCloudTitle: 'Faça login para desbloquear recursos na nuvem',
        authCloudSubtitle: 'Sincronize seu checklist.',
        authBenefitCloudSave: 'Salvar na nuvem',
        authBenefitShare: 'Compartilhar com parceiros',
        authBenefitMoreCloud: 'Mais recursos em nuvem',
        authComingSoonBadge: 'Em breve',
        authCloudAdvanceCta: 'Avançar para login',
        authCloudSignedInTitle: 'Conta conectada à nuvem',
        authCloudSignedInDesc: 'Sessão ativa.',
        authLogoutButton: 'Sair da conta',
      },
    });
    translate.use('pt-BR');

    fixture = TestBed.createComponent(CloudBenefitsBannerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Cenário: Usuário não autenticado visualiza os benefícios em nuvem e clica em avançar para login.
  // Objetivo: Garantir exibição dos benefícios com tag "Em breve" e emissão de advanceRequested.
  it('should render cloud benefits promo and emit advanceRequested when clicked', async () => {
    // Arrange
    const emitSpy = jest.spyOn(component.advanceRequested, 'emit');
    const hostEl = fixture.nativeElement as HTMLElement;

    // Act
    const advanceBtn = hostEl.querySelector<HTMLButtonElement>(
      '[data-testid="cloud-advance-login-btn"]',
    )!;
    advanceBtn.click();
    await fixture.whenStable();

    // Assert
    expect(hostEl.textContent).toContain('Salvar na nuvem');
    expect(hostEl.textContent).toContain('Compartilhar com parceiros');
    expect(hostEl.textContent).toContain('Em breve');
    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  // Cenário: Usuário já autenticado visualiza o estado conectado e solicita logout.
  // Objetivo: Exibir identidade autenticada e emitir logoutRequested ao clicar em sair.
  it('should render connected user details and emit logoutRequested', async () => {
    // Arrange
    fixture.componentRef.setInput('user', MOCK_USER);
    await fixture.whenStable();

    const logoutSpy = jest.spyOn(component.logoutRequested, 'emit');
    const hostEl = fixture.nativeElement as HTMLElement;

    // Act
    const logoutBtn = hostEl.querySelector<HTMLButtonElement>('.cloud-banner__ghost-btn')!;
    logoutBtn.click();
    await fixture.whenStable();

    // Assert
    expect(hostEl.textContent).toContain('Alex Silva');
    expect(hostEl.textContent).toContain('@alex.silva');
    expect(hostEl.textContent).toContain('alex@example.com');
    expect(logoutSpy).toHaveBeenCalledTimes(1);
  });
});
