import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ChecklistViewMode,
  ScaleOption,
  SupportedLanguage,
} from '../../../../core/models';
import { ChecklistHeaderComponent } from './checklist-header.component';

const MOCK_SCALES: readonly ScaleOption[] = [
  { id: 'hard_limit', order: 1, color: '#D32F2F', contrastColor: '#FFFFFF', icon: 'pi pi-ban' },
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
  { id: 'enjoy', order: 4, color: '#388E3C', contrastColor: '#FFFFFF', icon: 'pi pi-thumbs-up' },
  { id: 'favorite', order: 5, color: '#7B1FA2', contrastColor: '#FFFFFF', icon: 'pi pi-heart-fill' },
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
    currentLang?: SupportedLanguage;
    viewMode?: ChecklistViewMode;
    searchQuery?: string;
    onlyUnanswered?: boolean;
    answeredCount?: number;
    totalCount?: number;
    progressPercentage?: number;
    hasAnswers?: boolean;
  }): Promise<void> => {
    fixture.componentRef.setInput('currentLang', overrides?.currentLang ?? 'pt-BR');
    fixture.componentRef.setInput('viewMode', overrides?.viewMode ?? 'stepper');
    fixture.componentRef.setInput('searchQuery', overrides?.searchQuery ?? '');
    fixture.componentRef.setInput('onlyUnanswered', overrides?.onlyUnanswered ?? false);
    fixture.componentRef.setInput('answeredCount', overrides?.answeredCount ?? 3);
    fixture.componentRef.setInput('totalCount', overrides?.totalCount ?? 10);
    fixture.componentRef.setInput('progressPercentage', overrides?.progressPercentage ?? 30);
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

  it('should render ProgressIndicatorComponent and LegendBarComponent and allow collapsing legend', async () => {
    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelector('app-progress-indicator')).not.toBeNull();
    expect(hostEl.querySelector('app-legend-bar')).not.toBeNull();

    const toggleBtn = hostEl.querySelector<HTMLButtonElement>('.checklist-header__legend-toggle');
    expect(toggleBtn?.getAttribute('aria-expanded')).toBe('true');

    toggleBtn?.click();
    await fixture.whenStable();

    expect(toggleBtn?.getAttribute('aria-expanded')).toBe('false');
    expect(hostEl.querySelector('app-legend-bar')).toBeNull();
  });

  it('should emit languageChange when switching language in SelectButton', async () => {
    const emitted: SupportedLanguage[] = [];
    component.languageChange.subscribe((lang) => emitted.push(lang));

    const hostEl = fixture.nativeElement as HTMLElement;
    const langButtons = hostEl.querySelectorAll<HTMLElement>(
      '.checklist-header__lang-select mat-button-toggle button',
    );
    expect(langButtons.length).toBe(2);

    langButtons[1].click();
    await fixture.whenStable();

    expect(emitted).toEqual(['en-US']);
  });

  it('should emit viewModeChange when switching across stepper, classic, and full modes', async () => {
    const emitted: ChecklistViewMode[] = [];
    component.viewModeChange.subscribe((mode) => emitted.push(mode));

    const hostEl = fixture.nativeElement as HTMLElement;
    const modeButtons = hostEl.querySelectorAll<HTMLElement>(
      '.checklist-header__mode-select mat-button-toggle button',
    );
    expect(modeButtons.length).toBe(3);

    modeButtons[1].click();
    modeButtons[2].click();
    await fixture.whenStable();

    expect(emitted).toEqual(['classic', 'full']);
  });

  it('should emit searchQueryChange when typing into search input and clearing', async () => {
    const emitted: string[] = [];
    component.searchQueryChange.subscribe((q) => emitted.push(q));

    const hostEl = fixture.nativeElement as HTMLElement;
    const searchInput = hostEl.querySelector<HTMLInputElement>('.checklist-header__search-input');
    expect(searchInput).not.toBeNull();

    searchInput!.value = 'bondage';
    searchInput!.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();

    expect(emitted).toEqual(['bondage']);

    await setBaseInputs({ searchQuery: 'bondage' });
    const clearBtn = hostEl.querySelector<HTMLButtonElement>('.checklist-header__search-clear');
    expect(clearBtn).not.toBeNull();
    clearBtn!.click();
    await fixture.whenStable();

    expect(emitted).toEqual(['bondage', '']);
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

  it('should emit openQuickFill, clearAll, and goToExport on action button clicks', async () => {
    const quickFillSpy = jest.fn<void, []>();
    const clearAllSpy = jest.fn<void, []>();
    const exportSpy = jest.fn<void, []>();

    component.openQuickFill.subscribe(quickFillSpy);
    component.clearAll.subscribe(clearAllSpy);
    component.goToExport.subscribe(exportSpy);

    const hostEl = fixture.nativeElement as HTMLElement;
    hostEl.querySelector<HTMLButtonElement>('.checklist-header__quick-fill-btn')?.click();
    hostEl.querySelector<HTMLButtonElement>('.checklist-header__clear-btn')?.click();
    hostEl.querySelector<HTMLButtonElement>('.checklist-header__export-btn')?.click();
    await fixture.whenStable();

    expect(quickFillSpy).toHaveBeenCalledTimes(1);
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
