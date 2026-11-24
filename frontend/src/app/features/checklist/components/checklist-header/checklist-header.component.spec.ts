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
    searchQuery?: string;
    onlyUnanswered?: boolean;
    hasAnswers?: boolean;
    answeredCount?: number;
    totalCount?: number;
    autosaveText?: string;
    hasUnsavedChanges?: boolean;
  }): Promise<void> => {
    fixture.componentRef.setInput('viewMode', overrides?.viewMode ?? 'stepper');
    fixture.componentRef.setInput('searchQuery', overrides?.searchQuery ?? '');
    fixture.componentRef.setInput('onlyUnanswered', overrides?.onlyUnanswered ?? false);
    fixture.componentRef.setInput('scales', MOCK_SCALES);
    fixture.componentRef.setInput('scaleLabels', MOCK_SCALE_LABELS);
    fixture.componentRef.setInput('hasAnswers', overrides?.hasAnswers ?? true);
    if (overrides?.answeredCount !== undefined) {
      fixture.componentRef.setInput('answeredCount', overrides.answeredCount);
    }
    if (overrides?.totalCount !== undefined) {
      fixture.componentRef.setInput('totalCount', overrides.totalCount);
    }
    if (overrides?.autosaveText !== undefined) {
      fixture.componentRef.setInput('autosaveText', overrides.autosaveText);
    }
    if (overrides?.hasUnsavedChanges !== undefined) {
      fixture.componentRef.setInput('hasUnsavedChanges', overrides.hasUnsavedChanges);
    }
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

  it('should render a collapsible header with Ocultar/Mostrar toggle and without search input or scale legend', async () => {
    const hostEl = fixture.nativeElement as HTMLElement;
    const headerEl = hostEl.querySelector('.checklist-header');
    const toggleBtn = hostEl.querySelector<HTMLButtonElement>('.checklist-header__toggle-btn');

    expect(headerEl).not.toBeNull();
    expect(toggleBtn).not.toBeNull();
    expect(toggleBtn?.getAttribute('aria-expanded')).toBe('true');
    expect(toggleBtn?.textContent).toContain('Ocultar');
    expect(hostEl.querySelector('#checklist-header-body')).not.toBeNull();
    expect(hostEl.querySelector('.checklist-header__subtitle')).not.toBeNull();
    expect(hostEl.querySelector('mat-expansion-panel')).toBeNull();
    expect(hostEl.querySelector('app-legend-bar')).toBeNull();
    expect(hostEl.querySelector('.checklist-header__search-input')).toBeNull();
    expect(hostEl.querySelector('.checklist-header__lang-select')).toBeNull();

    toggleBtn!.click();
    await fixture.whenStable();

    expect(toggleBtn?.getAttribute('aria-expanded')).toBe('false');
    expect(toggleBtn?.textContent).toContain('Mostrar');
    expect(headerEl?.classList.contains('checklist-header--collapsed')).toBe(true);
    expect(hostEl.querySelector('#checklist-header-body')).toBeNull();
    expect(hostEl.querySelector('.checklist-header__subtitle')).toBeNull();

    toggleBtn!.click();
    await fixture.whenStable();

    expect(toggleBtn?.getAttribute('aria-expanded')).toBe('true');
    expect(toggleBtn?.textContent).toContain('Ocultar');
    expect(headerEl?.classList.contains('checklist-header--collapsed')).toBe(false);
    expect(hostEl.querySelector('#checklist-header-body')).not.toBeNull();
  });

  it('should disable Save button (gray) when clean and enable green button (saveNow) when dirty, plus toggle autosave', async () => {
    await setBaseInputs({
      autosaveText: 'Salvo às 21:28',
      hasUnsavedChanges: false,
    });
    const saveSpy = jest.fn<void, []>();
    const toggleSpy = jest.fn<void, [boolean]>();
    component.saveNow.subscribe(saveSpy);
    component.autosaveEnabledChange.subscribe(toggleSpy);

    const hostEl = fixture.nativeElement as HTMLElement;
    const saveBtn = hostEl.querySelector<HTMLButtonElement>('.checklist-header__save-btn');
    expect(saveBtn).not.toBeNull();
    expect(saveBtn?.textContent).toContain('Salvar');
    expect(saveBtn?.disabled).toBe(true);
    expect(saveBtn?.classList.contains('checklist-header__save-btn--dirty')).toBe(false);
    expect(hostEl.querySelector('.checklist-header__save-meta')?.textContent).toContain(
      'Salvo às 21:28',
    );

    await setBaseInputs({
      autosaveText: 'Salvo às 21:28',
      hasUnsavedChanges: true,
    });
    expect(saveBtn?.disabled).toBe(false);
    expect(saveBtn?.classList.contains('checklist-header__save-btn--dirty')).toBe(true);

    saveBtn!.click();
    await fixture.whenStable();
    expect(saveSpy).toHaveBeenCalledTimes(1);

    const toggleBtn = hostEl.querySelector<HTMLButtonElement>(
      '.checklist-header__autosave-toggle button[role="switch"]',
    );
    expect(toggleBtn).not.toBeNull();
    toggleBtn!.click();
    await fixture.whenStable();
    expect(toggleSpy).toHaveBeenCalledWith(false);
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

  it('should omit standalone quick-fill button, gate Exportar until all items are completed, and emit clearAll/goToExport', async () => {
    await setBaseInputs({ answeredCount: 1, totalCount: 2 });

    const clearAllSpy = jest.fn<void, []>();
    const exportSpy = jest.fn<void, []>();

    component.clearAll.subscribe(clearAllSpy);
    component.goToExport.subscribe(exportSpy);

    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelector('.checklist-header__quick-fill-btn')).toBeNull();

    const exportBtn = hostEl.querySelector<HTMLButtonElement>('.checklist-header__export-btn')!;
    expect(exportBtn.disabled).toBe(true);
    expect(exportBtn.classList.contains('checklist-header__export-btn--ready')).toBe(false);

    await setBaseInputs({ answeredCount: 2, totalCount: 2 });
    expect(exportBtn.disabled).toBe(false);
    expect(exportBtn.classList.contains('checklist-header__export-btn--ready')).toBe(true);

    hostEl.querySelector<HTMLButtonElement>('.checklist-header__clear-btn')?.click();
    exportBtn.click();
    await fixture.whenStable();

    expect(clearAllSpy).toHaveBeenCalledTimes(1);
    expect(exportSpy).toHaveBeenCalledTimes(1);
  });

  it('should disable clearAll button when hasAnswers is false', async () => {
    await setBaseInputs({ hasAnswers: false });
    const hostEl = fixture.nativeElement as HTMLElement;
    const clearBtn = hostEl.querySelector<HTMLButtonElement>('.checklist-header__clear-btn');
    expect(clearBtn?.disabled).toBe(true);
  });
});
