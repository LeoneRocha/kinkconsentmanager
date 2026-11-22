import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScaleId, ScaleOption } from '../../../core/models';
import { ScaleSelectorComponent } from './scale-selector.component';

const MOCK_SCALES: readonly ScaleOption[] = [
  {
    id: 'hard_limit',
    order: 1,
    color: '#D32F2F',
    contrastColor: '#FFFFFF',
    icon: 'pi pi-ban',
  },
  {
    id: 'soft_limit',
    order: 2,
    color: '#F57C00',
    contrastColor: '#111827',
    icon: 'pi pi-exclamation-triangle',
  },
  {
    id: 'curious',
    order: 3,
    color: '#FBC02D',
    contrastColor: '#111827',
    icon: 'pi pi-question-circle',
  },
  {
    id: 'enjoy',
    order: 4,
    color: '#388E3C',
    contrastColor: '#FFFFFF',
    icon: 'pi pi-thumbs-up',
  },
  {
    id: 'favorite',
    order: 5,
    color: '#7B1FA2',
    contrastColor: '#FFFFFF',
    icon: 'pi pi-heart-fill',
  },
];

const MOCK_LABELS: Readonly<Record<string, string>> = {
  hard_limit: 'Limite Rígido',
  soft_limit: 'Limite Flexível',
  curious: 'Curioso',
  enjoy: 'Gosto',
  favorite: 'Favorito',
};

describe('ScaleSelectorComponent', () => {
  let fixture: ComponentFixture<ScaleSelectorComponent>;
  let component: ScaleSelectorComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScaleSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ScaleSelectorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('scales', MOCK_SCALES);
    fixture.componentRef.setInput('scaleLabels', MOCK_LABELS);
    fixture.componentRef.setInput('roleTitle', 'Dando');
    await fixture.whenStable();
  });

  it('should render all 5 options with icons, aria-labels, and radiogroup role', () => {
    const hostEl = fixture.nativeElement as HTMLElement;
    const radiogroup = hostEl.querySelector('[role="radiogroup"]');
    expect(radiogroup).not.toBeNull();
    expect(radiogroup?.getAttribute('aria-label')).toBe('Dando');

    const buttons = hostEl.querySelectorAll<HTMLButtonElement>('button[role="radio"]');
    expect(buttons.length).toBe(5);

    MOCK_SCALES.forEach((scale, index) => {
      const btn = buttons[index];
      expect(btn.getAttribute('aria-label')).toBe(MOCK_LABELS[scale.id]);
      const iconEl = btn.querySelector('i');
      expect(iconEl).not.toBeNull();
      for (const cls of scale.icon.split(' ')) {
        expect(iconEl?.classList.contains(cls)).toBe(true);
      }
    });
  });

  it('should emit selected ScaleId when an unselected option is clicked', () => {
    const emitSpy = jest.fn<void, [ScaleId | undefined]>();
    component.scaleChange.subscribe(emitSpy);

    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
      'button[role="radio"]',
    );
    buttons[3].click();

    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith('enjoy');
  });

  it('should emit undefined when clicking the currently selected scale', async () => {
    fixture.componentRef.setInput('selectedScale', 'curious');
    await fixture.whenStable();

    const emitSpy = jest.fn<void, [ScaleId | undefined]>();
    component.scaleChange.subscribe(emitSpy);

    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
      'button[role="radio"]',
    );
    buttons[2].click();

    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith(undefined);
  });

  it('should ignore clicks when disabled is true', async () => {
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();

    const emitSpy = jest.fn<void, [ScaleId | undefined]>();
    component.scaleChange.subscribe(emitSpy);

    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
      'button[role="radio"]',
    );
    expect(buttons[0].disabled).toBe(true);
    buttons[0].click();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should set aria-checked="true" only on the selected button', async () => {
    fixture.componentRef.setInput('selectedScale', 'favorite');
    await fixture.whenStable();

    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
      'button[role="radio"]',
    );

    expect(buttons[0].getAttribute('aria-checked')).toBe('false');
    expect(buttons[1].getAttribute('aria-checked')).toBe('false');
    expect(buttons[2].getAttribute('aria-checked')).toBe('false');
    expect(buttons[3].getAttribute('aria-checked')).toBe('false');
    expect(buttons[4].getAttribute('aria-checked')).toBe('true');
    expect(buttons[4].classList.contains('scale-selector__btn--selected')).toBe(true);
  });

  it('should support ArrowRight, ArrowLeft, ArrowUp, and ArrowDown keyboard navigation', () => {
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
      'button[role="radio"]',
    );

    buttons[0].focus();
    expect(document.activeElement).toBe(buttons[0]);

    buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(buttons[1]);

    buttons[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(buttons[2]);

    buttons[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(document.activeElement).toBe(buttons[1]);

    buttons[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement).toBe(buttons[0]);

    buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(document.activeElement).toBe(buttons[4]);
  });

  it('should apply compact modifier class when compact is true', async () => {
    fixture.componentRef.setInput('compact', true);
    await fixture.whenStable();

    const rootEl = (fixture.nativeElement as HTMLElement).querySelector('.scale-selector');
    expect(rootEl?.classList.contains('scale-selector--compact')).toBe(true);
  });
});
