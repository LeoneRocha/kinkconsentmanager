import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  GroupDefinition,
  ItemResponseValue,
  ResolvedPreviewTexts,
  ScaleOption,
} from '../../../../core/models';
import { QuickFillWizardModalComponent } from './quick-fill-wizard-modal.component';

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
    items: [
      { id: 'item_safeword', type: 'single_choice', options: ['opt_a'] },
      { id: 'item_checkin', type: 'scale_matrix', dualRole: false },
    ],
  },
  {
    id: 'grp_bondage',
    order: 2,
    defaultDualRole: true,
    rolePairId: 'giving_receiving',
    items: [
      { id: 'item_rope', type: 'scale_matrix', dualRole: true },
      { id: 'item_cuffs', type: 'scale_matrix', dualRole: true },
    ],
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
    grp_safety: { title: 'Safety' },
    grp_bondage: { title: 'Bondage' },
  },
  items: {
    item_safeword: { label: 'Safeword' },
    item_checkin: { label: 'Check-ins' },
    item_rope: { label: 'Rope Bondage' },
    item_cuffs: { label: 'Handcuffs' },
  },
  options: {
    opt_a: 'Option A',
  },
};

describe('QuickFillWizardModalComponent', () => {
  let fixture: ComponentFixture<QuickFillWizardModalComponent>;
  let component: QuickFillWizardModalComponent;

  const setBaseInputs = async (overrides?: {
    visible?: boolean;
    groups?: readonly GroupDefinition[];
    answers?: Readonly<Record<string, ItemResponseValue>>;
  }): Promise<void> => {
    fixture.componentRef.setInput('visible', overrides?.visible ?? true);
    fixture.componentRef.setInput('groups', overrides?.groups ?? MOCK_GROUPS);
    fixture.componentRef.setInput('scales', MOCK_SCALES);
    fixture.componentRef.setInput('answers', overrides?.answers ?? {});
    fixture.componentRef.setInput('texts', MOCK_TEXTS);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuickFillWizardModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(QuickFillWizardModalComponent);
    component = fixture.componentInstance;
    await setBaseInputs();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should flatten scale_matrix items into sequential steps, splitting dualRole items into 2 steps and skipping non-scale items', () => {
    const hostEl = fixture.nativeElement as HTMLElement;
    const counter = hostEl.querySelector('.quick-fill__counter');
    // item_safeword skipped, item_checkin -> 1 step, item_rope -> 2 steps, item_cuffs -> 2 steps => 5 total
    expect(counter?.textContent?.trim()).toBe('1 / 5');
    expect(hostEl.querySelector('.quick-fill__current-item')?.textContent?.trim()).toBe(
      'Check-ins',
    );
    expect(hostEl.querySelector('.quick-fill__current-role')?.textContent?.trim()).toBe('General');

    // Should show up to 3 next steps: Rope (Giving), Rope (Receiving), Cuffs (Giving)
    const nextRows = hostEl.querySelectorAll('.quick-fill__context--next .quick-fill__context-btn');
    expect(nextRows.length).toBe(3);
    expect(nextRows[0].textContent).toContain('Rope Bondage');
    expect(nextRows[0].textContent).toContain('Giving');
    expect(nextRows[1].textContent).toContain('Rope Bondage');
    expect(nextRows[1].textContent).toContain('Receiving');
  });

  it('should handle keyboard 1-5 (and Numpad) by emitting answerChange and auto-advancing', async () => {
    const emitted: { itemId: string; patch: Partial<ItemResponseValue> }[] = [];
    component.answerChange.subscribe((val) => emitted.push(val));

    // Step 1/5: item_checkin (single-role) -> key '4' => enjoy
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '4' }));
    await fixture.whenStable();

    expect(emitted[0]).toEqual({ itemId: 'item_checkin', patch: { primaryScale: 'enjoy' } });
    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelector('.quick-fill__counter')?.textContent?.trim()).toBe('2 / 5');
    expect(hostEl.querySelector('.quick-fill__current-item')?.textContent?.trim()).toBe(
      'Rope Bondage',
    );
    expect(hostEl.querySelector('.quick-fill__current-role')?.textContent?.trim()).toBe('Giving');

    // Step 2/5: item_rope primary -> Numpad5 => favorite, advances to item_rope secondary
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '5', code: 'Numpad5' }));
    await fixture.whenStable();

    expect(emitted[1]).toEqual({ itemId: 'item_rope', patch: { primaryScale: 'favorite' } });
    expect(hostEl.querySelector('.quick-fill__counter')?.textContent?.trim()).toBe('3 / 5');
    expect(hostEl.querySelector('.quick-fill__current-role')?.textContent?.trim()).toBe(
      'Receiving',
    );

    // Step 3/5: item_rope secondary -> key '1' => hard_limit
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    await fixture.whenStable();

    expect(emitted[2]).toEqual({ itemId: 'item_rope', patch: { secondaryScale: 'hard_limit' } });
    expect(hostEl.querySelector('.quick-fill__counter')?.textContent?.trim()).toBe('4 / 5');
  });

  it('should clear current step scale on key 0 without advancing', async () => {
    await setBaseInputs({
      answers: {
        item_checkin: { primaryScale: 'curious' },
        item_rope: { primaryScale: 'enjoy', secondaryScale: 'soft_limit' },
      },
    });

    const emitted: { itemId: string; patch: Partial<ItemResponseValue> }[] = [];
    component.answerChange.subscribe((val) => emitted.push(val));

    // Move to step 3 (item_rope secondary) via ArrowDown twice
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelector('.quick-fill__counter')?.textContent?.trim()).toBe('3 / 5');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '0' }));
    await fixture.whenStable();

    expect(emitted).toEqual([{ itemId: 'item_rope', patch: { secondaryScale: undefined } }]);
    expect(hostEl.querySelector('.quick-fill__counter')?.textContent?.trim()).toBe('3 / 5');
  });

  it('should navigate between steps with ArrowUp/ArrowDown and context button clicks', async () => {
    const hostEl = fixture.nativeElement as HTMLElement;

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    await fixture.whenStable();
    expect(hostEl.querySelector('.quick-fill__counter')?.textContent?.trim()).toBe('2 / 5');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    await fixture.whenStable();
    expect(hostEl.querySelector('.quick-fill__counter')?.textContent?.trim()).toBe('1 / 5');

    // Boundary check: ArrowUp at step 1 stays at 1
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    await fixture.whenStable();
    expect(hostEl.querySelector('.quick-fill__counter')?.textContent?.trim()).toBe('1 / 5');

    // Click next context item (step index 3 -> step 4/5)
    const nextBtns = hostEl.querySelectorAll<HTMLButtonElement>(
      '.quick-fill__context--next .quick-fill__context-btn',
    );
    nextBtns[2].click();
    await fixture.whenStable();
    expect(hostEl.querySelector('.quick-fill__counter')?.textContent?.trim()).toBe('4 / 5');

    // Should display up to 3 previous context items now
    const prevBtns = hostEl.querySelectorAll<HTMLButtonElement>(
      '.quick-fill__context--prev .quick-fill__context-btn',
    );
    expect(prevBtns.length).toBe(3);
  });

  it('should emit visibleChange(false) on Escape and ignore keyboard shortcuts when closed', async () => {
    const visibleEvents: boolean[] = [];
    const answerEvents: { itemId: string; patch: Partial<ItemResponseValue> }[] = [];
    component.visibleChange.subscribe((v) => visibleEvents.push(v));
    component.answerChange.subscribe((a) => answerEvents.push(a));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(visibleEvents).toEqual([false]);

    await setBaseInputs({ visible: false });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }));
    await fixture.whenStable();
    expect(answerEvents).toEqual([]);
  });

  it('should render empty state when groups contain no scale_matrix items', async () => {
    await setBaseInputs({
      groups: [
        {
          id: 'grp_safety',
          order: 1,
          defaultDualRole: false,
          rolePairId: 'general',
          items: [{ id: 'item_safeword', type: 'single_choice', options: ['opt_a'] }],
        },
      ],
    });

    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelector('.quick-fill')).toBeNull();
    expect(hostEl.querySelector('.quick-fill__empty')?.textContent).toContain(
      'Não há itens de escala disponíveis',
    );
  });
});
