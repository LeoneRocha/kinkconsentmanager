import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { AUTH_SESSION_STORAGE_KEY } from '../../../../core/services';
import { HeaderUtilitiesComponent } from './header-utilities.component';

describe('HeaderUtilitiesComponent', () => {
  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [HeaderUtilitiesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' }),
      ],
    }).compileComponents();

    TestBed.inject(TranslateService).setTranslation('pt-BR', {
      ui: {
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
  });

  it('should coordinate mutually exclusive popovers and close on Escape or outside click', async () => {
    localStorage.setItem(
      AUTH_SESSION_STORAGE_KEY,
      JSON.stringify({
        user: {
          id: 9,
          name: 'Ana',
          login: 'ana',
          email: 'ana@exemplo.com',
          isActive: true,
          createdAt: '2026-11-26T00:00:00Z',
        },
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAtUtc: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    );

    const fixture = TestBed.createComponent(HeaderUtilitiesComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const themeBtn = el.querySelector('.app-shell__icon-btn--theme') as HTMLButtonElement;
    const langBtn = el.querySelector('.app-shell__icon-btn--lang') as HTMLButtonElement;
    const userBtn = el.querySelector('[data-testid="header-user-btn"]') as HTMLButtonElement;

    themeBtn.click();
    fixture.detectChanges();
    expect(el.querySelector('.app-shell__popover--theme-menu')).not.toBeNull();
    expect(el.querySelector('.app-shell__popover--menu')).toBeNull();

    langBtn.click();
    fixture.detectChanges();
    expect(el.querySelector('.app-shell__popover--theme-menu')).toBeNull();
    expect(el.querySelector('.app-shell__popover--menu')).not.toBeNull();

    userBtn.click();
    fixture.detectChanges();
    expect(el.querySelector('.app-shell__popover--menu')).toBeNull();
    expect(el.querySelector('.app-shell__popover--user-menu')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(el.querySelector('.app-shell__popover--user-menu')).toBeNull();

    themeBtn.click();
    fixture.detectChanges();
    expect(el.querySelector('.app-shell__popover--theme-menu')).not.toBeNull();

    document.body.click();
    fixture.detectChanges();
    expect(el.querySelector('.app-shell__popover--theme-menu')).toBeNull();
  });
});
