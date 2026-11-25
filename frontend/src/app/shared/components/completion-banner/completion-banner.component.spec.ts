import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CompletionBannerComponent } from './completion-banner.component';

describe('CompletionBannerComponent', () => {
  let fixture: ComponentFixture<CompletionBannerComponent>;
  let component: CompletionBannerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompletionBannerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CompletionBannerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Checklist concluído!');
    fixture.componentRef.setInput('message', 'Todas as questões visíveis foram respondidas.');
    await fixture.whenStable();
  });

  it('should render accessible status region with title, message, and custom icon', async () => {
    const hostEl = fixture.nativeElement as HTMLElement;
    const section = hostEl.querySelector<HTMLElement>('.completion-banner')!;

    expect(section).not.toBeNull();
    expect(section.getAttribute('role')).toBe('status');
    expect(section.getAttribute('aria-live')).toBe('polite');
    expect(section.getAttribute('aria-label')).toBe('Checklist concluído!');
    expect(hostEl.querySelector('.completion-banner__title')?.textContent?.trim()).toBe(
      'Checklist concluído!',
    );
    expect(hostEl.querySelector('.completion-banner__desc')?.textContent?.trim()).toBe(
      'Todas as questões visíveis foram respondidas.',
    );
    expect(hostEl.querySelector('.completion-banner__icon i')?.className).toContain(
      'fa-circle-check',
    );

    fixture.componentRef.setInput('icon', 'fa-solid fa-star');
    await fixture.whenStable();
    expect(hostEl.querySelector('.completion-banner__icon i')?.className).toContain('fa-star');
  });

  it('should render and emit secondary and primary actions and respect showSecondaryAction/null labels', async () => {
    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelector('.completion-banner__secondary-btn')).toBeNull();
    expect(hostEl.querySelector('.completion-banner__primary-btn')).toBeNull();

    fixture.componentRef.setInput('secondaryActionLabel', 'Revisar respostas');
    fixture.componentRef.setInput('primaryActionLabel', 'Exportar');
    await fixture.whenStable();

    const secBtn = hostEl.querySelector<HTMLButtonElement>(
      'button[data-action="review-checklist"]',
    )!;
    const primBtn = hostEl.querySelector<HTMLButtonElement>(
      'button[data-action="export-checklist"]',
    )!;
    expect(secBtn).not.toBeNull();
    expect(primBtn).not.toBeNull();

    const secSpy = jest.fn<void, []>();
    const primSpy = jest.fn<void, []>();
    component.secondaryAction.subscribe(secSpy);
    component.primaryAction.subscribe(primSpy);

    secBtn.click();
    primBtn.click();
    expect(secSpy).toHaveBeenCalledTimes(1);
    expect(primSpy).toHaveBeenCalledTimes(1);

    fixture.componentRef.setInput('showSecondaryAction', false);
    await fixture.whenStable();
    expect(hostEl.querySelector('button[data-action="review-checklist"]')).toBeNull();
    expect(hostEl.querySelector('button[data-action="export-checklist"]')).not.toBeNull();
  });
});
