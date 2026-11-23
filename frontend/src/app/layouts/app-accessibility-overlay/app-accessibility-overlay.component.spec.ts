import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { AccessibilityService } from '../../core/services';
import { AppAccessibilityOverlayComponent } from './app-accessibility-overlay.component';

describe('AppAccessibilityOverlayComponent', () => {
  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [AppAccessibilityOverlayComponent],
      providers: [provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' })],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', {
      ui: {
        a11yCaptionTitle: 'Legenda Audiovisual',
        a11yCaptionDismiss: 'Fechar legenda',
        a11yStopReading: 'Parar leitura',
      },
    });
  });

  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('should render live announcement in polite status region even when visual captions are off', async () => {
    const fixture = TestBed.createComponent(AppAccessibilityOverlayComponent);
    const a11yService = TestBed.inject(AccessibilityService);
    a11yService.announce('Item salvo com sucesso');
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const statusRegion = el.querySelector('[role="status"][aria-live="polite"]');
    expect(statusRegion?.textContent?.trim()).toBe('Item salvo com sucesso');
    expect(el.querySelector('.app-shell__caption-bar')).toBeNull();
  });

  it('should render caption bar when visual captions are enabled and dismiss when closed', async () => {
    const fixture = TestBed.createComponent(AppAccessibilityOverlayComponent);
    const a11yService = TestBed.inject(AccessibilityService);
    a11yService.toggleVisualCaptions();
    a11yService.announce('Texto em legenda ao vivo');
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const captionBar = el.querySelector('.app-shell__caption-bar');
    expect(captionBar).not.toBeNull();
    expect(captionBar?.textContent).toContain('Texto em legenda ao vivo');

    const dismissSpy = jest.spyOn(a11yService, 'dismissCaption');
    const dismissBtn = el.querySelector(
      'button[aria-label="Fechar legenda"]',
    ) as HTMLButtonElement;
    dismissBtn.click();
    fixture.detectChanges();

    expect(dismissSpy).toHaveBeenCalledTimes(1);
    expect(el.querySelector('.app-shell__caption-bar')).toBeNull();
  });

  it('should show stop-reading button while speaking and call stopSpeaking on click', async () => {
    const fixture = TestBed.createComponent(AppAccessibilityOverlayComponent);
    const a11yService = TestBed.inject(AccessibilityService);
    a11yService.toggleVisualCaptions();
    a11yService.announce('Leitura em andamento');
    jest.spyOn(a11yService, 'isSpeaking').mockReturnValue(true);
    const stopSpy = jest.spyOn(a11yService, 'stopSpeaking');

    fixture.detectChanges();
    await fixture.whenStable();

    const stopBtn = (fixture.nativeElement as HTMLElement).querySelector(
      'button[aria-label="Parar leitura"]',
    ) as HTMLButtonElement;
    expect(stopBtn).not.toBeNull();
    stopBtn.click();

    expect(stopSpy).toHaveBeenCalledTimes(1);
  });
});
