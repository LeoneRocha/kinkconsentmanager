import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  GroupDefinition,
  ItemResponseValue,
  ResolvedPreviewTexts,
  ScaleOption,
} from '../../../../core/models';
import { CategoryAccordionComponent } from './category-accordion.component';

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

const MOCK_GROUPS: readonly GroupDefinition[] = [
  {
    id: 'grp_safety',
    order: 1,
    defaultDualRole: false,
    rolePairId: 'general',
    items: [
      { id: 'item_safeword', type: 'single_choice', options: ['opt_traffic', 'opt_word'] },
    ],
  },
  {
    id: 'grp_bondage',
    order: 2,
    defaultDualRole: true,
    rolePairId: 'giving_receiving',
    items: [
      { id: 'item_rope', type: 'scale_matrix', dualRole: true },
    ],
  },
];

const MOCK_TEXTS: ResolvedPreviewTexts = {
  title: 'KinkConsentManager',
  schemaVersionLabel: 'Schema Version',
  generatedAtLabel: 'Generated at',
  generatedAtValue: '2026-11-22',
  notAnsweredLabel: 'Not answered',
  otherLabel: 'Other',
  scales: {
    hard_limit: 'Hard Limit',
    soft_limit: 'Soft Limit',
    curious: 'Curious',
    enjoy: 'Enjoy',
    favorite: 'Favorite',
  },
  roles: {
    general: { primary: 'General' },
    giving_receiving: { primary: 'Giving', secondary: 'Receiving' },
  },
  groups: {
    grp_safety: { title: 'Safety & Health', description: 'Safewords and care.' },
    grp_bondage: { title: 'Bondage', description: 'Restraints and ropes.' },
  },
  items: {
    item_safeword: { label: 'Safeword System' },
    item_rope: { label: 'Rope Bondage' },
  },
  options: {
    opt_traffic: 'Traffic Light',
    opt_word: 'Custom Word',
  },
};

describe('CategoryAccordionComponent', () => {
  let fixture: ComponentFixture<CategoryAccordionComponent>;
  let component: CategoryAccordionComponent;

  const setBaseInputs = async (overrides?: {
    groups?: readonly GroupDefinition[];
    activeIndex?: number;
    answers?: Readonly<Record<string, ItemResponseValue>>;
  }): Promise<void> => {
    fixture.componentRef.setInput('groups', overrides?.groups ?? MOCK_GROUPS);
    fixture.componentRef.setInput('scales', MOCK_SCALES);
    fixture.componentRef.setInput('answers', overrides?.answers ?? {});
    fixture.componentRef.setInput('activeIndex', overrides?.activeIndex ?? 0);
    fixture.componentRef.setInput('texts', MOCK_TEXTS);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryAccordionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryAccordionComponent);
    component = fixture.componentInstance;
    await setBaseInputs();
  });

  it('should render accordion panels with group titles, descriptions, and item counts', () => {
    const hostEl = fixture.nativeElement as HTMLElement;
    const panels = hostEl.querySelectorAll('mat-expansion-panel');
    expect(panels.length).toBe(2);

    const titles = Array.from(hostEl.querySelectorAll('.category-accordion__title')).map((el) =>
      el.textContent?.trim(),
    );
    expect(titles).toEqual(['Safety & Health', 'Bondage']);
    expect(panels[0].classList.contains('mat-expanded')).toBe(true);
    expect(panels[1].classList.contains('mat-expanded')).toBe(false);
    expect(panels[0].textContent).toContain('Safewords and care.');
  });

  it('should emit activeIndexChange when clicking a different accordion header', async () => {
    const emitted: number[] = [];
    component.activeIndexChange.subscribe((idx) => emitted.push(idx));

    const hostEl = fixture.nativeElement as HTMLElement;
    const headers = hostEl.querySelectorAll<HTMLElement>('mat-expansion-panel-header');
    expect(headers.length).toBe(2);

    headers[1].click();
    await fixture.whenStable();

    expect(emitted).toEqual([1]);
  });

  it('should render nextCategory button on non-last panel and emit nextCategory on click', async () => {
    const nextSpy = jest.fn<void, []>();
    component.nextCategory.subscribe(nextSpy);

    const hostEl = fixture.nativeElement as HTMLElement;
    const firstPanel = hostEl.querySelectorAll('mat-expansion-panel')[0];
    const nextBtn = firstPanel.querySelector<HTMLButtonElement>('.category-accordion__next-btn');
    const finishBtnInFirst = firstPanel.querySelector('.category-accordion__finish-btn');

    expect(nextBtn).not.toBeNull();
    expect(finishBtnInFirst).toBeNull();

    nextBtn!.click();
    await fixture.whenStable();

    expect(nextSpy).toHaveBeenCalledTimes(1);
  });

  it('should render finish button on last panel and emit finishChecklist on click', async () => {
    await setBaseInputs({ activeIndex: 1 });

    const finishSpy = jest.fn<void, []>();
    component.finishChecklist.subscribe(finishSpy);

    const hostEl = fixture.nativeElement as HTMLElement;
    const lastPanel = hostEl.querySelectorAll('mat-expansion-panel')[1];
    const finishBtn = lastPanel.querySelector<HTMLButtonElement>('.category-accordion__finish-btn');
    const nextBtnInLast = lastPanel.querySelector('.category-accordion__next-btn');

    expect(finishBtn).not.toBeNull();
    expect(nextBtnInLast).toBeNull();

    finishBtn!.click();
    await fixture.whenStable();

    expect(finishSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit answerChange with itemId and patch when child question item changes', async () => {
    await setBaseInputs({ activeIndex: 1 });

    const emitted: { itemId: string; patch: Partial<ItemResponseValue> }[] = [];
    component.answerChange.subscribe((val) => emitted.push(val));

    const hostEl = fixture.nativeElement as HTMLElement;
    const lastPanel = hostEl.querySelectorAll('mat-expansion-panel')[1];
    const scaleButtons = lastPanel.querySelectorAll<HTMLButtonElement>('button[role="radio"]');
    expect(scaleButtons.length).toBe(10);

    scaleButtons[3].click();
    await fixture.whenStable();

    expect(emitted).toEqual([{ itemId: 'item_rope', patch: { primaryScale: 'enjoy' } }]);
  });

  it('should display empty state when groups is empty', async () => {
    await setBaseInputs({ groups: [] });
    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelector('mat-accordion')).toBeNull();
    expect(hostEl.querySelector('.category-accordion__empty')?.textContent).toContain(
      'Nenhum item encontrado',
    );
  });
});
