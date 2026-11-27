import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { AccessibilityService, I18nService } from '../../../../core/services';
import { HeaderLanguageMenuComponent } from './header-language-menu.component';

describe('HeaderLanguageMenuComponent', () => {
  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [HeaderLanguageMenuComponent],
      providers: [provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' })],
    }).compileComponents();

    TestBed.inject(TranslateService).setTranslation('pt-BR', {
      ui: {
        languageMenuLabel: 'Alterar idioma',
        languageChanged: 'Idioma alterado para Português (Brasil).',
      },
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should render language pill, emit toggleRequested, and switch language cleanly', async () => {
    const fixture = TestBed.createComponent(HeaderLanguageMenuComponent);
    const i18nService = TestBed.inject(I18nService);
    const a11yService = TestBed.inject(AccessibilityService);

    let toggled = 0;
    let closedCount = 0;
    fixture.componentInstance.toggleRequested.subscribe(() => toggled++);
    fixture.componentInstance.closed.subscribe(() => closedCount++);

    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.app-shell__lang-pill')?.textContent?.trim()).toBe('PT');

    const btn = el.querySelector('.app-shell__icon-btn--lang') as HTMLButtonElement;
    btn.click();
    expect(toggled).toBe(1);

    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    await fixture.whenStable();

    const items = Array.from(el.querySelectorAll('.app-shell__menu-item')) as HTMLButtonElement[];
    expect(items.length).toBe(2);
    items[1].click();
    await fixture.whenStable();

    expect(i18nService.currentLang()).toBe('en-US');
    expect(closedCount).toBe(1);
    expect(a11yService.liveAnnouncement().length).toBeGreaterThan(0);
  });
});
