import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProgressIndicatorComponent } from './progress-indicator.component';

describe('ProgressIndicatorComponent', () => {
  let fixture: ComponentFixture<ProgressIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgressIndicatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressIndicatorComponent);
    fixture.componentRef.setInput('answered', 12);
    fixture.componentRef.setInput('total', 40);
    fixture.componentRef.setInput('percentage', 30);
    fixture.componentRef.setInput('label', 'Progresso Geral');
    await fixture.whenStable();
  });

  it('should display label, answered/total counts, percentage, and progressbar value', () => {
    const hostEl = fixture.nativeElement as HTMLElement;
    const labelEl = hostEl.querySelector('.progress-indicator__label');
    const statsEl = hostEl.querySelector('.progress-indicator__stats');
    const barEl = hostEl.querySelector('[role="progressbar"]');

    expect(labelEl?.textContent?.trim()).toBe('Progresso Geral');
    expect(statsEl?.textContent?.trim()).toBe('12 / 40 (30%)');
    expect(barEl?.getAttribute('aria-valuenow')).toBe('30');
  });

  it('should clamp negative percentages to 0', async () => {
    fixture.componentRef.setInput('answered', 0);
    fixture.componentRef.setInput('total', 20);
    fixture.componentRef.setInput('percentage', -15);
    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;
    const statsEl = hostEl.querySelector('.progress-indicator__stats');
    const barEl = hostEl.querySelector('[role="progressbar"]');

    expect(statsEl?.textContent?.trim()).toBe('0 / 20 (0%)');
    expect(barEl?.getAttribute('aria-valuenow')).toBe('0');
  });

  it('should clamp percentages above 100 to 100', async () => {
    fixture.componentRef.setInput('answered', 25);
    fixture.componentRef.setInput('total', 20);
    fixture.componentRef.setInput('percentage', 142);
    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;
    const statsEl = hostEl.querySelector('.progress-indicator__stats');
    const barEl = hostEl.querySelector('[role="progressbar"]');

    expect(statsEl?.textContent?.trim()).toBe('25 / 20 (100%)');
    expect(barEl?.getAttribute('aria-valuenow')).toBe('100');
  });
});
