import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import {
  AccessibilityService,
  AUTH_SESSION_STORAGE_KEY,
  AuthService,
  I18nService,
  ThemeService,
} from '../../core/services';
import { AppHeaderComponent } from './app-header.component';

@Component({
  template: '',
})
class DummyRouteComponent { }

describe('AppHeaderComponent', () => {
  const clearRootClasses = (): void => {
    document.documentElement.classList.remove(
      'app-dark',
      'app-theme-sober',
      'app-high-contrast',
      'app-font-large',
      'app-font-xlarge',
      'app-reduced-motion',
    );
    document.documentElement.removeAttribute('data-theme');
  };

  beforeEach(async () => {
    localStorage.clear();
    clearRootClasses();

    await TestBed.configureTestingModule({
      imports: [AppHeaderComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'dashboard', component: DummyRouteComponent },
          { path: 'checklist', component: DummyRouteComponent },
        ]),
        provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' }),
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', {
      ui: {
        title: 'Kink Consent Manager',
        navDashboard: 'Dashboard',
        themeToggleToDark: 'Ativar tema escuro',
        themeToggleToLight: 'Ativar tema claro',
        themeDarkActive: 'Tema escuro ativado.',
        themeLightActive: 'Tema claro ativado.',
        themeMenuLabel: 'Alterar tema',
        themeSoberLabel: 'Sóbrio (Preto & Branco)',
        themeSoberDesc: 'Branco e preto com detalhes em azul e degradê',
        themeSoberActive: 'Tema sóbrio ativado.',
        themeLightLabel: 'Claro (Vermelho)',
        themeLightDesc: 'Visual claro com destaques em vermelho',
        themeDarkLabel: 'Escuro (Vermelho)',
        themeDarkDesc: 'Visual escuro com destaques em vermelho',
        languageMenuLabel: 'Alterar idioma',
        languageChanged: 'Idioma alterado para Português (Brasil).',
        a11yButtonLabel: 'Acessibilidade e leitura audiovisual',
        a11yPanelTitle: 'Acessibilidade & Audiovisual',
        a11yAudioAssist: 'Leitura em voz alta automática',
        a11yAudioAssistHint: 'Lê itens via navegador.',
        a11yVisualCaptions: 'Legendas visuais ao vivo',
        a11yVisualCaptionsHint: 'Exibe barra de legenda.',
        a11ySpeechRate: 'Velocidade da voz',
        a11ySpeechSlow: 'Lenta',
        a11ySpeechNormal: 'Normal',
        a11ySpeechFast: 'Rápida',
        a11yHighContrast: 'Alto contraste (WCAG AAA)',
        a11yHighContrastHint: 'Reforça bordas.',
        a11yFontSize: 'Tamanho do texto',
        a11yFontNormal: 'Padrão',
        a11yFontLarge: 'Grande',
        a11yFontXLarge: 'Extra',
        a11yReducedMotion: 'Reduzir animações',
        a11yReducedMotionHint: 'Desativa transições.',
        a11yReset: 'Restaurar padrões',
        a11yStopReading: 'Parar leitura',
        a11yClosePanel: 'Fechar painel',
        a11ySpeechUnsupported: 'Síntese indisponível.',
        authUserMenuLabel: 'Conta do usuário',
        authLogoutButton: 'Sair da conta',
        authLogoutSuccess: 'Sessão encerrada com sucesso.',
      },
    });
  });

  afterEach(() => {
    localStorage.clear();
    clearRootClasses();
    jest.restoreAllMocks();
  });

  it('should render brand link pointing to /dashboard and utility controls', async () => {
    const fixture = TestBed.createComponent(AppHeaderComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const brandLink = el.querySelector<HTMLAnchorElement>('a.app-shell__brand');
    expect(brandLink?.getAttribute('href')).toBe('/dashboard');
    expect(brandLink?.getAttribute('title')).toContain('Kink Consent Manager');
    const brandImg = el.querySelector<HTMLImageElement>('img.app-shell__brand-icon');
    expect(brandImg?.getAttribute('alt')).toBe('Kink Consent Manager');
    expect(brandImg?.getAttribute('title')).toBe('Kink Consent Manager');
    expect(el.querySelector('.app-shell__brand-title')?.textContent?.trim()).toBe(
      'Kink Consent Manager',
    );
    expect(el.querySelector('.app-shell__brand-title')?.getAttribute('title')).toBe(
      'Kink Consent Manager — Dashboard',
    );
    expect(el.querySelector('.app-shell__lang-pill')?.textContent?.trim()).toBe('PT');
  });

  // Cenário: Clique direto no título `.app-shell__brand-title` estando em outra rota e com menu aberto.
  // Objetivo: Garantir que o clique navegue para `/dashboard` e feche popovers abertos do cabeçalho.
  it('should navigate to /dashboard and close open popovers when clicking app-shell__brand-title', async () => {
    const fixture = TestBed.createComponent(AppHeaderComponent);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/checklist');
    fixture.detectChanges();
    await fixture.whenStable();

    const langBtn = fixture.nativeElement.querySelector(
      '.app-shell__icon-btn--lang',
    ) as HTMLButtonElement;
    langBtn.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.app-shell__popover--menu')).not.toBeNull();

    const brandTitle = fixture.nativeElement.querySelector(
      '.app-shell__brand-title',
    ) as HTMLSpanElement;
    brandTitle.click();
    await fixture.whenStable();

    expect(router.url).toBe('/dashboard');
    expect(fixture.nativeElement.querySelector('.app-shell__popover--menu')).toBeNull();
  });

  // Cenário: Verificação dos atributos title em todos os botões utilitários e ícones do cabeçalho.
  // Objetivo: Garantir que controles visuais e ícones exponham metadados descritivos para leitores audiovisuais.
  it('should expose title attributes on header utility buttons and icons', async () => {
    const fixture = TestBed.createComponent(AppHeaderComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(
      el.querySelectorAll<HTMLButtonElement>('.app-shell__utilities button'),
    );
    expect(buttons.length).toBe(3);
    for (const btn of buttons) {
      expect(btn.getAttribute('title')?.trim().length).toBeGreaterThan(0);
    }

    const icons = Array.from(el.querySelectorAll<HTMLElement>('i'));
    expect(icons.length).toBeGreaterThan(0);
    for (const icon of icons) {
      expect(icon.getAttribute('title')?.trim().length).toBeGreaterThan(0);
    }
  });

  // Cenário: Abertura do menu de temas na barra superior com as 3 opções fixas.
  // Objetivo: Renderizar Sóbrio, Claro e Escuro com títulos acessíveis, alternar temas e anunciar o estado selecionado.
  it('should open theme menu with 3 fixed presets, apply sober/dark themes, and announce selection', async () => {
    const fixture = TestBed.createComponent(AppHeaderComponent);
    const themeService = TestBed.inject(ThemeService);
    const a11yService = TestBed.inject(AccessibilityService);
    fixture.detectChanges();
    await fixture.whenStable();

    const themeBtn = fixture.nativeElement.querySelector(
      '.app-shell__icon-btn--theme',
    ) as HTMLButtonElement;
    themeBtn.click();
    await fixture.whenStable();

    const menu = fixture.nativeElement.querySelector('.app-shell__popover--theme-menu');
    expect(menu).not.toBeNull();
    const options = Array.from(
      fixture.nativeElement.querySelectorAll('.app-shell__theme-item'),
    ) as HTMLButtonElement[];
    expect(options.map((item) => item.getAttribute('data-theme-option'))).toEqual([
      'sober',
      'light',
      'dark',
    ]);
    for (const option of options) {
      expect(option.getAttribute('title')?.trim().length).toBeGreaterThan(0);
    }

    options[0].click();
    await fixture.whenStable();
    expect(themeService.theme()).toBe('sober');
    expect(themeService.isSober()).toBe(true);
    expect(document.documentElement.classList.contains('app-theme-sober')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('sober');
    expect(a11yService.liveAnnouncement()).toBe('Tema sóbrio ativado.');
    expect(fixture.nativeElement.querySelector('.app-shell__popover--theme-menu')).toBeNull();

    themeBtn.click();
    await fixture.whenStable();
    const darkOption = fixture.nativeElement.querySelector(
      'button[data-theme-option="dark"]',
    ) as HTMLButtonElement;
    darkOption.click();
    await fixture.whenStable();

    expect(themeService.isDark()).toBe(true);
    expect(document.documentElement.classList.contains('app-dark')).toBe(true);
    expect(a11yService.liveAnnouncement()).toBe('Tema escuro ativado.');
  });

  it('should open language menu, switch language, and close on escape or outside click', async () => {
    const fixture = TestBed.createComponent(AppHeaderComponent);
    const i18nService = TestBed.inject(I18nService);
    fixture.detectChanges();
    await fixture.whenStable();

    const langBtn = fixture.nativeElement.querySelector(
      '.app-shell__icon-btn--lang',
    ) as HTMLButtonElement;
    langBtn.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.app-shell__popover--menu')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.app-shell__popover--menu')).toBeNull();

    langBtn.click();
    await fixture.whenStable();
    const items = Array.from(
      fixture.nativeElement.querySelectorAll('.app-shell__menu-item'),
    ) as HTMLButtonElement[];
    items[1].click();
    await fixture.whenStable();

    expect(i18nService.currentLang()).toBe('en-US');
    expect(fixture.nativeElement.querySelector('.app-shell__popover--menu')).toBeNull();
  });

  it('should open accessibility panel and reset preferences', async () => {
    const fixture = TestBed.createComponent(AppHeaderComponent);
    const a11yService = TestBed.inject(AccessibilityService);
    fixture.detectChanges();
    await fixture.whenStable();

    const a11yBtn = fixture.nativeElement.querySelector(
      '.app-shell__icon-btn--a11y',
    ) as HTMLButtonElement;
    a11yBtn.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('#a11y-control-panel')).not.toBeNull();

    a11yService.toggleHighContrast();
    await fixture.whenStable();
    expect(a11yService.highContrast()).toBe(true);

    const resetBtn = fixture.nativeElement.querySelector(
      '.app-shell__reset-btn',
    ) as HTMLButtonElement;
    expect(resetBtn.disabled).toBe(false);
    resetBtn.click();
    await fixture.whenStable();

    expect(a11yService.highContrast()).toBe(false);
  });

  // Cenário: Usuário autenticado visualizando a barra superior nos três temas (sober, light e dark).
  // Objetivo: Exibir o botão de usuário com ícone temático e permitir abrir o menu da conta e encerrar a sessão.
  it('should render themed user icon when authenticated, open account menu, and sign out', async () => {
    localStorage.setItem(
      AUTH_SESSION_STORAGE_KEY,
      JSON.stringify({
        user: {
          id: 42,
          login: 'ana.silva',
          isActive: true,
          createdAt: '2026-11-26T00:00:00Z',
        },
        accessToken: 'jwt-access-token',
        refreshToken: 'jwt-refresh-token',
        expiresAtUtc: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    );

    const fixture = TestBed.createComponent(AppHeaderComponent);
    const themeService = TestBed.inject(ThemeService);
    const authService = TestBed.inject(AuthService);
    const httpTesting = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const userBtn = el.querySelector<HTMLButtonElement>('[data-testid="header-user-btn"]');
    expect(userBtn).not.toBeNull();
    expect(userBtn?.classList.contains('app-shell__icon-btn--user')).toBe(true);
    expect(userBtn?.getAttribute('title')).toContain('ana.silva');

    const userIcon = userBtn?.querySelector<HTMLElement>('i.fa-user.app-shell__user-icon');
    expect(userIcon).not.toBeNull();
    expect(userIcon?.getAttribute('title')).toContain('ana.silva');

    for (const mode of ['sober', 'light', 'dark'] as const) {
      themeService.setTheme(mode);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(document.documentElement.getAttribute('data-theme')).toBe(mode);
      expect(el.querySelector('[data-testid="header-user-btn"]')).not.toBeNull();
    }

    userBtn?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const menu = el.querySelector('.app-shell__popover--user-menu');
    expect(menu).not.toBeNull();
    expect(menu?.textContent).toContain('@ana.silva');
    expect(menu?.textContent).not.toContain('ana@exemplo.com');

    const logoutBtn = el.querySelector<HTMLButtonElement>('[data-testid="header-user-logout"]');
    expect(logoutBtn).not.toBeNull();
    logoutBtn?.click();

    const req = httpTesting.expectOne('/api/v1/auth/logout');
    expect(req.request.method).toBe('POST');
    req.flush({ isSuccess: true, data: true });

    fixture.detectChanges();
    await fixture.whenStable();

    expect(authService.user()).toBeNull();
    expect(el.querySelector('[data-testid="header-user-btn"]')).toBeNull();
    httpTesting.verify();
  });
});
