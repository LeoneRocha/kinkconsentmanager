import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChecklistViewMode, ScaleOption } from '../../../../core/models';
import { ChecklistHeaderComponent } from './checklist-header.component';

const MOCK_SCALES: readonly ScaleOption[] = [
  {
    id: 'hard_limit',
    order: 1,
    color: '#D32F2F',
    contrastColor: '#FFFFFF',
    icon: 'fa-solid fa-ban',
  },
  {
    id: 'soft_limit',
    order: 2,
    color: '#F57C00',
    contrastColor: '#111827',
    icon: 'fa-solid fa-triangle-exclamation',
  },
  {
    id: 'curious',
    order: 3,
    color: '#FBC02D',
    contrastColor: '#111827',
    icon: 'fa-solid fa-circle-question',
  },
  {
    id: 'enjoy',
    order: 4,
    color: '#388E3C',
    contrastColor: '#FFFFFF',
    icon: 'fa-solid fa-circle-check',
  },
  {
    id: 'favorite',
    order: 5,
    color: '#7B1FA2',
    contrastColor: '#FFFFFF',
    icon: 'fa-solid fa-heart',
  },
];

const MOCK_SCALE_LABELS: Readonly<Record<string, string>> = {
  hard_limit: 'Hard Limit',
  soft_limit: 'Soft Limit',
  curious: 'Curious',
  enjoy: 'Enjoy',
  favorite: 'Favorite',
};

describe('ChecklistHeaderComponent', () => {
  let fixture: ComponentFixture<ChecklistHeaderComponent>;
  let component: ChecklistHeaderComponent;

  const setBaseInputs = async (overrides?: {
    viewMode?: ChecklistViewMode;
    onlyUnanswered?: boolean;
    hasAnswers?: boolean;
  }): Promise<void> => {
    fixture.componentRef.setInput('viewMode', overrides?.viewMode ?? 'stepper');
    fixture.componentRef.setInput('onlyUnanswered', overrides?.onlyUnanswered ?? false);
    fixture.componentRef.setInput('scales', MOCK_SCALES);
    fixture.componentRef.setInput('scaleLabels', MOCK_SCALE_LABELS);
    fixture.componentRef.setInput('hasAnswers', overrides?.hasAnswers ?? true);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChecklistHeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChecklistHeaderComponent);
    component = fixture.componentInstance;
    await setBaseInputs();
  });

  it('should render a collapsible header with icon toggle and clickable title row without save/export/autosave, search input, or scale legend', async () => {
    const hostEl = fixture.nativeElement as HTMLElement;
    const headerEl = hostEl.querySelector('.checklist-header');
    const topBarEl = hostEl.querySelector<HTMLElement>('.checklist-header__top')!;
    const titleEl = hostEl.querySelector<HTMLElement>('.checklist-header__title')!;
    const toggleBtn = hostEl.querySelector<HTMLButtonElement>('.checklist-header__toggle-btn')!;

    expect(headerEl).not.toBeNull();
    expect(toggleBtn).not.toBeNull();
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Ocultar cabeçalho do checklist');
    expect(toggleBtn.textContent?.trim()).toBe('');
    expect(toggleBtn.querySelector('i.fa-chevron-up')).not.toBeNull();
    expect(hostEl.querySelector('#checklist-header-body')).not.toBeNull();
    expect(hostEl.querySelector('.checklist-header__subtitle')).not.toBeNull();
    expect(hostEl.querySelector('mat-expansion-panel')).toBeNull();
    expect(hostEl.querySelector('app-legend-bar')).toBeNull();
    expect(hostEl.querySelector('.checklist-header__search-input')).toBeNull();
    expect(hostEl.querySelector('.checklist-header__lang-select')).toBeNull();
    expect(hostEl.querySelector('.checklist-header__save-btn')).toBeNull();
    expect(hostEl.querySelector('.checklist-header__export-btn')).toBeNull();
    expect(hostEl.querySelector('.checklist-header__autosave-toggle')).toBeNull();

    toggleBtn.click();
    await fixture.whenStable();

    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Mostrar cabeçalho do checklist');
    expect(toggleBtn.querySelector('i.fa-chevron-down')).not.toBeNull();
    expect(headerEl?.classList.contains('checklist-header--collapsed')).toBe(true);
    expect(hostEl.querySelector('#checklist-header-body')).toBeNull();
    expect(hostEl.querySelector('.checklist-header__subtitle')).toBeNull();

    titleEl.click();
    await fixture.whenStable();

    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Ocultar cabeçalho do checklist');
    expect(toggleBtn.querySelector('i.fa-chevron-up')).not.toBeNull();
    expect(headerEl?.classList.contains('checklist-header--collapsed')).toBe(false);
    expect(hostEl.querySelector('#checklist-header-body')).not.toBeNull();

    topBarEl.click();
    await fixture.whenStable();

    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
    expect(headerEl?.classList.contains('checklist-header--collapsed')).toBe(true);
    expect(hostEl.querySelector('#checklist-header-body')).toBeNull();
  });

  it('should emit viewModeChange when switching across stepper, classic, full, and quick_fill modes', async () => {
    const emitted: ChecklistViewMode[] = [];
    component.viewModeChange.subscribe((mode) => emitted.push(mode));

    const hostEl = fixture.nativeElement as HTMLElement;
    const modeButtons = hostEl.querySelectorAll<HTMLElement>(
      '.checklist-header__mode-select mat-button-toggle button',
    );
    expect(modeButtons.length).toBe(4);

    modeButtons[1].click();
    modeButtons[2].click();
    modeButtons[3].click();
    await fixture.whenStable();

    expect(emitted).toEqual(['classic', 'full', 'quick_fill']);
  });

  it('should emit onlyUnansweredChange when toggling the filter switch', async () => {
    const emitted: boolean[] = [];
    component.onlyUnansweredChange.subscribe((enabled) => emitted.push(enabled));

    const hostEl = fixture.nativeElement as HTMLElement;
    const toggleBtn = hostEl.querySelector<HTMLButtonElement>(
      '#only-unanswered-toggle button[role="switch"]',
    );
    expect(toggleBtn).not.toBeNull();

    toggleBtn!.click();
    await fixture.whenStable();

    expect(emitted).toEqual([true]);
  });

  it('should emit clearAll when clear button is clicked and disable it when hasAnswers is false', async () => {
    const clearAllSpy = jest.fn<void, []>();
    component.clearAll.subscribe(clearAllSpy);

    const hostEl = fixture.nativeElement as HTMLElement;
    const clearBtn = hostEl.querySelector<HTMLButtonElement>('.checklist-header__clear-btn')!;
    expect(clearBtn.disabled).toBe(false);

    clearBtn.click();
    await fixture.whenStable();
    expect(clearAllSpy).toHaveBeenCalledTimes(1);

    await setBaseInputs({ hasAnswers: false });
    expect(clearBtn.disabled).toBe(true);
  });
});
