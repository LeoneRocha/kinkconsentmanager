import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { AccessibilityService, ThemeService } from '../../../../core/services';
import { HeaderThemeMenuComponent } from './header-theme-menu.component';

describe('HeaderThemeMenuComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.classList.remove('app-dark', 'app-theme-sober');
    document.documentElement.removeAttribute('data-theme');

    await TestBed.configureTestingModule({
      imports: [HeaderThemeMenuComponent],
      providers: [provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' })],
    }).compileComponents();

    TestBed.inject(TranslateService).setTranslation('pt-BR', {
      ui: {
        themeMenuLabel: 'Alterar tema',
        themeSoberLabel: 'Sóbrio (Preto & Branco)',
        themeSoberDesc: 'Branco e preto com detalhes em azul e degradê',
        themeSoberActive: 'Tema sóbrio ativado.',
        themeLightLabel: 'Claro (Vermelho)',
        themeLightDesc: 'Visual claro com destaques em vermelho',
        themeLightActive: 'Tema claro ativado.',
        themeDarkLabel: 'Escuro (Vermelho)',
        themeDarkDesc: 'Visual escuro com destaques em vermelho',
        themeDarkActive: 'Tema escuro ativado.',
      },
    });
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('app-dark', 'app-theme-sober');
    document.documentElement.removeAttribute('data-theme');
  });

  it('should emit toggleRequested when button is clicked and switch themes when menu is open', async () => {
    const fixture = TestBed.createComponent(HeaderThemeMenuComponent);
    const themeService = TestBed.inject(ThemeService);
    const a11yService = TestBed.inject(AccessibilityService);

    let toggled = 0;
    let closedCount = 0;
    fixture.componentInstance.toggleRequested.subscribe(() => toggled++);
    fixture.componentInstance.closed.subscribe(() => closedCount++);

    fixture.detectChanges();
    await fixture.whenStable();

    const btn = fixture.nativeElement.querySelector(
      '.app-shell__icon-btn--theme',
    ) as HTMLButtonElement;
    expect(btn.getAttribute('title')).toBe('Alterar tema');
    btn.click();
    expect(toggled).toBe(1);
    expect(fixture.nativeElement.querySelector('.app-shell__popover--theme-menu')).toBeNull();

    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    await fixture.whenStable();

    const options = Array.from(
      fixture.nativeElement.querySelectorAll('.app-shell__theme-item'),
    ) as HTMLButtonElement[];
    expect(options.map((item) => item.getAttribute('data-theme-option'))).toEqual([
      'sober',
      'light',
      'dark',
    ]);

    options[0].click();
    expect(themeService.theme()).toBe('sober');
    expect(a11yService.liveAnnouncement()).toBe('Tema sóbrio ativado.');
    expect(closedCount).toBe(1);
  });
});
