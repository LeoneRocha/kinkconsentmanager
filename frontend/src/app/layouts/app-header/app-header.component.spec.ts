import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { AccessibilityService, I18nService, ThemeService } from '../../core/services';
import { AppHeaderComponent } from './app-header.component';

describe('AppHeaderComponent', () => {
  const clearRootClasses = (): void => {
    document.documentElement.classList.remove(
      'app-dark',
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
        provideRouter([]),
        provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' }),
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', {
      ui: {
        title: 'KinkConsentManager',
        themeToggleToDark: 'Ativar tema escuro',
        themeToggleToLight: 'Ativar tema claro',
        themeDarkActive: 'Tema escuro ativado.',
        themeLightActive: 'Tema claro ativado.',
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
      },
    });
  });

  afterEach(() => {
    localStorage.clear();
    clearRootClasses();
    jest.restoreAllMocks();
  });

  it('should render brand link pointing to /checklist and utility controls', async () => {
    const fixture = TestBed.createComponent(AppHeaderComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const brandLink = el.querySelector<HTMLAnchorElement>('a.app-shell__brand');
    expect(brandLink?.getAttribute('href')).toBe('/checklist');
    expect(el.querySelector('.app-shell__brand-title')?.textContent?.trim()).toBe(
      'KinkConsentManager',
    );
    expect(el.querySelector('.app-shell__lang-pill')?.textContent?.trim()).toBe('PT');
  });

  it('should toggle dark theme and announce state', async () => {
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

    expect(themeService.isDark()).toBe(true);
    expect(themeBtn.getAttribute('aria-pressed')).toBe('true');
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
});
