import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { App } from './app.component';
import { routes } from './app.routes';
import { AccessibilityService, I18nService, ThemeService } from './core/services';
import { environment } from '../environments/environment';

@Component({
  template: '',
})
class DummyShellRouteComponent {}

describe('App', () => {
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
      imports: [App],
      providers: [
        provideRouter(routes),
        provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' }),
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', {
      ui: {
        title: 'Kink Consent Manager',
        navDashboard: 'Dashboard',
        navChecklist: 'Checklist',
        navExport: 'Exportar',
        privacyNotice: 'Privacidade local: seus dados permanecem exclusivamente no seu navegador.',
        footerCopyright: 'Todos os direitos reservados.',
        footerVersionLabel: 'Versão',
        footerBuildLabel: 'build',
        notificationsRegionLabel: 'Notificações',
        notificationCloseLabel: 'Fechar notificação',
        skipToContent: 'Ir direto para o conteúdo principal',
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
        langPtBr: 'Português (Brasil)',
        langEnUs: 'English (US)',
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
        a11yCaptionTitle: 'Legenda Audiovisual',
        a11yCaptionDismiss: 'Fechar legenda',
        a11yClosePanel: 'Fechar painel',
        a11ySpeechUnsupported: 'Síntese indisponível.',
      },
    });
  });

  afterEach(() => {
    localStorage.clear();
    clearRootClasses();
    jest.restoreAllMocks();
  });

  it('should create the app shell', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should keep a clean topbar with brand link and utility controls without topbar nav clutter', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const brandLink = el.querySelector<HTMLAnchorElement>('a.app-shell__brand');
    expect(brandLink?.getAttribute('href')).toBe('/dashboard');
    expect(el.querySelector('nav')).toBeNull();
    expect(el.querySelector('.app-shell__utilities')).not.toBeNull();
  });

  it('should include main landmark, router-outlet, live status region, and privacy notice with copyright and version', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('router-outlet')).not.toBeNull();
    expect(el.querySelector('main#main-content')).not.toBeNull();
    expect(el.querySelector('app-toast-container')).not.toBeNull();
    expect(el.querySelector('[role="status"]')).not.toBeNull();
    expect(el.textContent).toContain('Privacidade local');
    const footer = el.querySelector('footer.app-shell__footer');
    expect(footer?.textContent).toContain(String(new Date().getFullYear()));
    expect(footer?.textContent).toContain(environment.appName);
    expect(footer?.textContent).toContain('Todos os direitos reservados.');
    expect(footer?.textContent).toContain(
      `Versão ${environment.version} (build ${environment.buildDate})`,
    );
  });

  it('should configure lazy routes for dashboard and checklist with fallback redirect', () => {
    expect(routes.map((route) => route.path)).toEqual(['', 'dashboard', 'checklist', '**']);
    expect(routes[0]?.redirectTo).toBe('dashboard');
    expect(routes[3]?.redirectTo).toBe('dashboard');
  });

  // Cenário: Seleção do tema sóbrio e escuro via menu de temas da barra superior.
  // Objetivo: Atualizar classes CSS na raiz do documento e anunciar o tema escolhido para leitores de tela.
  it('should switch themes via topbar theme menu and announce change', async () => {
    const fixture = TestBed.createComponent(App);
    const themeService = TestBed.inject(ThemeService);
    const a11yService = TestBed.inject(AccessibilityService);
    fixture.detectChanges();
    await fixture.whenStable();

    const themeBtn = fixture.nativeElement.querySelector(
      '.app-shell__icon-btn--theme',
    ) as HTMLButtonElement;
    expect(themeBtn.getAttribute('aria-expanded')).toBe('false');

    themeBtn.click();
    await fixture.whenStable();
    expect(themeBtn.getAttribute('aria-expanded')).toBe('true');

    const soberOption = fixture.nativeElement.querySelector(
      'button[data-theme-option="sober"]',
    ) as HTMLButtonElement;
    soberOption.click();
    await fixture.whenStable();

    expect(themeService.theme()).toBe('sober');
    expect(document.documentElement.classList.contains('app-theme-sober')).toBe(true);
    expect(a11yService.liveAnnouncement()).toBe('Tema sóbrio ativado.');

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

  // Cenário: Abertura do menu de globo e seleção de idioma na barra superior.
  // Objetivo: Alterar o idioma ativo no I18nService e sincronizar o atributo `<html lang>`.
  it('should switch application language via topbar globe menu and sync document lang', async () => {
    const fixture = TestBed.createComponent(App);
    const i18nService = TestBed.inject(I18nService);
    fixture.detectChanges();
    await fixture.whenStable();

    const langBtn = fixture.nativeElement.querySelector(
      '.app-shell__icon-btn--lang',
    ) as HTMLButtonElement;
    langBtn.click();
    await fixture.whenStable();

    const menuItems = Array.from(
      fixture.nativeElement.querySelectorAll('.app-shell__menu-item'),
    ) as HTMLButtonElement[];
    expect(menuItems.length).toBe(2);

    menuItems[1].click();
    await fixture.whenStable();

    expect(i18nService.currentLang()).toBe('en-US');
    expect(document.documentElement.lang).toBe('en-US');
  });

  // Cenário: Abertura do painel audiovisual e ativação de legendas visuais ao vivo + alto contraste.
  // Objetivo: Renderizar a barra de legenda flutuante e aplicar a classe `app-high-contrast`.
  it('should open accessibility panel, toggle high contrast and visual captions, and render caption bar', async () => {
    const fixture = TestBed.createComponent(App);
    const a11yService = TestBed.inject(AccessibilityService);
    fixture.detectChanges();
    await fixture.whenStable();

    const a11yBtn = fixture.nativeElement.querySelector(
      '.app-shell__icon-btn--a11y',
    ) as HTMLButtonElement;
    a11yBtn.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('#a11y-control-panel')).not.toBeNull();

    a11yService.toggleVisualCaptions();
    a11yService.toggleHighContrast();
    a11yService.announce('Item de teste anunciado');
    await fixture.whenStable();

    expect(document.documentElement.classList.contains('app-high-contrast')).toBe(true);
    const captionBar = fixture.nativeElement.querySelector('.app-shell__caption-bar');
    expect(captionBar).not.toBeNull();
    expect(captionBar.textContent).toContain('Item de teste anunciado');
  });

  // Cenário: Navegação por foco com leitura audiovisual ativada no shell principal.
  // Objetivo: Capturar `focusin` no componente raiz e encaminhar ao `AccessibilityService.announceElement`.
  it('should announce focused controls via AccessibilityService when captions are active', async () => {
    const fixture = TestBed.createComponent(App);
    const a11yService = TestBed.inject(AccessibilityService);
    a11yService.toggleVisualCaptions();
    fixture.detectChanges();
    await fixture.whenStable();

    const themeBtn = fixture.nativeElement.querySelector(
      '.app-shell__icon-btn--theme',
    ) as HTMLButtonElement;
    themeBtn.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await fixture.whenStable();

    expect(a11yService.liveAnnouncement()).toBe('Alterar tema');
  });

  // Cenário: Clique no título `.app-shell__brand-title` no shell principal após navegação para `/checklist`.
  // Objetivo: Garantir que o roteador retorne imediatamente à rota `/dashboard`.
  it('should navigate back to /dashboard when clicking app-shell__brand-title from another route', async () => {
    const router = TestBed.inject(Router);
    router.resetConfig([
      { path: 'dashboard', component: DummyShellRouteComponent },
      { path: 'checklist', component: DummyShellRouteComponent },
    ]);

    const fixture = TestBed.createComponent(App);
    await router.navigateByUrl('/checklist');
    fixture.detectChanges();
    await fixture.whenStable();

    const brandTitle = fixture.nativeElement.querySelector(
      '.app-shell__brand-title',
    ) as HTMLSpanElement;
    brandTitle.click();
    await fixture.whenStable();

    expect(router.url).toBe('/dashboard');
  });
});
