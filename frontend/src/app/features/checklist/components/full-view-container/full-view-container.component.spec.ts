import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  GroupDefinition,
  ItemResponseValue,
  ResolvedPreviewTexts,
  ScaleOption,
} from '../../../../core/models';
import { FullViewContainerComponent } from './full-view-container.component';

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
  {
    id: 'favorite',
    order: 5,
    color: '#7B1FA2',
    contrastColor: '#FFFFFF',
    icon: 'pi pi-heart-fill',
  },
];

const MOCK_GROUPS: readonly GroupDefinition[] = [
  {
    id: 'grp_safety',
    order: 1,
    defaultDualRole: false,
    rolePairId: 'general',
    items: [{ id: 'item_safeword', type: 'restricted_text', maxLength: 200 }],
  },
  {
    id: 'grp_bondage',
    order: 2,
    defaultDualRole: true,
    rolePairId: 'giving_receiving',
    items: [{ id: 'item_rope', type: 'scale_matrix', dualRole: true }],
  },
];

const MOCK_TEXTS: ResolvedPreviewTexts = {
  title: 'Kink Consent Manager',
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
    item_safeword: { label: 'Safeword Notes' },
    item_rope: { label: 'Rope Bondage' },
  },
  options: {},
};

describe('FullViewContainerComponent', () => {
  let fixture: ComponentFixture<FullViewContainerComponent>;
  let component: FullViewContainerComponent;

  const setBaseInputs = async (overrides?: {
    groups?: readonly GroupDefinition[];
    answers?: Readonly<Record<string, ItemResponseValue>>;
  }): Promise<void> => {
    fixture.componentRef.setInput('groups', overrides?.groups ?? MOCK_GROUPS);
    fixture.componentRef.setInput('scales', MOCK_SCALES);
    fixture.componentRef.setInput('answers', overrides?.answers ?? {});
    fixture.componentRef.setInput('texts', MOCK_TEXTS);
    fixture.componentRef.setInput('noResultsText', 'No matching items found');
    fixture.componentRef.setInput('finishLabel', 'Finish & Export');
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FullViewContainerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FullViewContainerComponent);
    component = fixture.componentInstance;
    await setBaseInputs();
  });

  it('should render all groups expanded simultaneously with quick jump pills and question items', () => {
    const hostEl = fixture.nativeElement as HTMLElement;
    const sections = hostEl.querySelectorAll('.full-view__section');
    const pills = hostEl.querySelectorAll('.full-view__pill');
    const questions = hostEl.querySelectorAll('app-dynamic-question-item');

    expect(sections.length).toBe(2);
    expect(pills.length).toBe(2);
    expect(questions.length).toBe(2);
    expect(sections[0].textContent).toContain('Safety & Health');
    expect(sections[1].textContent).toContain('Bondage');
  });

  it('should display empty state with noResultsText when groups is empty', async () => {
    await setBaseInputs({ groups: [] });

    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelector('.full-view')).toBeNull();
    const emptyEl = hostEl.querySelector('.full-view__empty');
    expect(emptyEl?.textContent).toContain('No matching items found');
  });

  it('should emit answerChange when any question item emits a change', async () => {
    const emitted: { itemId: string; patch: Partial<ItemResponseValue> }[] = [];
    component.answerChange.subscribe((val) => emitted.push(val));

    const hostEl = fixture.nativeElement as HTMLElement;
    const sections = hostEl.querySelectorAll('.full-view__section');
    const scaleButtons = sections[1].querySelectorAll<HTMLButtonElement>('button[role="radio"]');

    scaleButtons[4].click();
    await fixture.whenStable();

    expect(emitted).toEqual([{ itemId: 'item_rope', patch: { primaryScale: 'favorite' } }]);
  });

  it('should emit finishChecklist when finish CTA button is clicked', async () => {
    const finishSpy = jest.fn<void, []>();
    component.finishChecklist.subscribe(finishSpy);

    const hostEl = fixture.nativeElement as HTMLElement;
    const finishBtn = hostEl.querySelector<HTMLButtonElement>('.full-view__finish-btn');
    expect(finishBtn).not.toBeNull();
    finishBtn!.click();
    await fixture.whenStable();

    expect(finishSpy).toHaveBeenCalledTimes(1);
  });

  it('should scroll smoothly to target group section when clicking a quick jump pill', () => {
    const hostEl = fixture.nativeElement as HTMLElement;
    const targetSection = hostEl.querySelector('#checklist-group-grp_bondage') as HTMLElement;
    const scrollIntoViewMock = jest.fn();
    targetSection.scrollIntoView = scrollIntoViewMock;

    jest.spyOn(document, 'getElementById').mockReturnValue(targetSection);

    const pills = hostEl.querySelectorAll<HTMLButtonElement>('.full-view__pill');
    pills[1].click();

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  // Cenário: Expansão e recolhimento de seções no modo Visão Completa e autoexpansão via atalho rápido.
  // Objetivo: Garantir alternância por seção e botão global usando fa-angles-up/down e abertura automática ao clicar na pill.
  it('should collapse and expand individual sections, toggle all, and auto-expand collapsed sections on quick-jump', async () => {
    const hostEl = fixture.nativeElement as HTMLElement;
    const toggleAllBtn = hostEl.querySelector<HTMLButtonElement>('.full-view__toggle-all-btn')!;
    const sectionToggleBtns = Array.from(
      hostEl.querySelectorAll<HTMLButtonElement>('.full-view__toggle-btn'),
    );
    const sectionHeaders = Array.from(
      hostEl.querySelectorAll<HTMLElement>('.full-view__section-header'),
    );
    const sections = Array.from(hostEl.querySelectorAll<HTMLElement>('.full-view__section'));

    expect(toggleAllBtn.getAttribute('aria-expanded')).toBe('true');
    expect(toggleAllBtn.querySelector('i.fa-angles-up')).not.toBeNull();
    expect(sectionToggleBtns.length).toBe(2);
    expect(sectionToggleBtns.every((b) => b.querySelector('i.fa-angles-up') !== null)).toBe(true);

    // Recolher uma seção pelo botão
    sectionToggleBtns[1].click();
    await fixture.whenStable();
    expect(sectionToggleBtns[1].getAttribute('aria-expanded')).toBe('false');
    expect(sectionToggleBtns[1].querySelector('i.fa-angles-down')).not.toBeNull();
    expect(sections[1].querySelector('.full-view__section-desc')).toBeNull();
    expect(sections[1].querySelector('.full-view__items')).toBeNull();
    expect(toggleAllBtn.getAttribute('aria-expanded')).toBe('false');

    // Clicar no atalho rápido deve expandir automaticamente a seção antes de rolar
    const targetSection = hostEl.querySelector('#checklist-group-grp_bondage') as HTMLElement;
    targetSection.scrollIntoView = jest.fn();
    jest.spyOn(document, 'getElementById').mockReturnValue(targetSection);
    hostEl.querySelectorAll<HTMLButtonElement>('.full-view__pill')[1].click();
    await fixture.whenStable();

    expect(sectionToggleBtns[1].getAttribute('aria-expanded')).toBe('true');
    expect(sections[1].querySelector('.full-view__items')).not.toBeNull();

    // Alternar seção pelo cabeçalho e recolher/expandir tudo
    sectionHeaders[0].click();
    await fixture.whenStable();
    expect(sectionToggleBtns[0].getAttribute('aria-expanded')).toBe('false');

    toggleAllBtn.click();
    await fixture.whenStable();
    expect(sections.every((s) => s.querySelector('.full-view__items') !== null)).toBe(true);

    toggleAllBtn.click();
    await fixture.whenStable();
    expect(sections.every((s) => s.querySelector('.full-view__items') === null)).toBe(true);
    expect(toggleAllBtn.querySelector('i.fa-angles-down')).not.toBeNull();
  });
});
