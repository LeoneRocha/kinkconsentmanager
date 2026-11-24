import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { AppPopperPopoverComponent } from './popper-popover.component';

@Component({
  imports: [AppPopperPopoverComponent],
  template: `
    <app-popper-popover placement="bottom-start">
      <button type="button" popperTrigger class="host-btn">Abrir</button>
      <p class="host-content">Conteúdo posicionado</p>
    </app-popper-popover>
  `,
})
class PopperHostComponent {}

describe('AppPopperPopoverComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PopperHostComponent],
      providers: [provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' })],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', {
      ui: {
        popoverDefaultLabel: 'Painel contextual',
      },
    });
  });

  it('should toggle popover via trigger click, use i18n fallback label, and close on escape or outside click', async () => {
    const fixture = TestBed.createComponent(PopperHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const triggerBtn = host.querySelector<HTMLButtonElement>('.host-btn')!;
    const panel = host.querySelector<HTMLElement>('.kcm-popper__panel')!;

    expect(panel.hidden).toBe(true);
    expect(panel.getAttribute('aria-label')).toBe('Painel contextual');

    triggerBtn.click();
    fixture.detectChanges();
    expect(panel.hidden).toBe(false);
    expect(panel.textContent).toContain('Conteúdo posicionado');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(panel.hidden).toBe(true);

    triggerBtn.click();
    fixture.detectChanges();
    expect(panel.hidden).toBe(false);

    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(panel.hidden).toBe(true);
  });
});
