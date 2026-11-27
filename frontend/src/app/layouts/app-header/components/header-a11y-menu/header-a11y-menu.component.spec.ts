import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { AccessibilityService } from '../../../../core/services';
import { HeaderA11yMenuComponent } from './header-a11y-menu.component';

describe('HeaderA11yMenuComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.classList.remove(
      'app-high-contrast',
      'app-font-large',
      'app-font-xlarge',
      'app-reduced-motion',
    );

    await TestBed.configureTestingModule({
      imports: [HeaderA11yMenuComponent],
      providers: [provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' })],
    }).compileComponents();

    TestBed.inject(TranslateService).setTranslation('pt-BR', {
      ui: {
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
    document.documentElement.classList.remove(
      'app-high-contrast',
      'app-font-large',
      'app-font-xlarge',
      'app-reduced-motion',
    );
  });

  it('should emit toggleRequested, open panel when active, reset assists, and emit closed', async () => {
    const fixture = TestBed.createComponent(HeaderA11yMenuComponent);
    const a11yService = TestBed.inject(AccessibilityService);

    let toggled = 0;
    let closedCount = 0;
    fixture.componentInstance.toggleRequested.subscribe(() => toggled++);
    fixture.componentInstance.closed.subscribe(() => closedCount++);

    fixture.detectChanges();
    await fixture.whenStable();

    const btn = fixture.nativeElement.querySelector(
      '.app-shell__icon-btn--a11y',
    ) as HTMLButtonElement;
    btn.click();
    expect(toggled).toBe(1);
    expect(fixture.nativeElement.querySelector('#a11y-control-panel')).toBeNull();

    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('#a11y-control-panel')).not.toBeNull();

    a11yService.toggleHighContrast();
    await fixture.whenStable();
    expect(a11yService.highContrast()).toBe(true);

    const resetBtn = fixture.nativeElement.querySelector(
      '.app-shell__reset-btn',
    ) as HTMLButtonElement;
    resetBtn.click();
    await fixture.whenStable();
    expect(a11yService.highContrast()).toBe(false);

    const closeBtn = fixture.nativeElement.querySelector(
      '.app-shell__panel-close',
    ) as HTMLButtonElement;
    closeBtn.click();
    expect(closedCount).toBe(1);
  });
});
