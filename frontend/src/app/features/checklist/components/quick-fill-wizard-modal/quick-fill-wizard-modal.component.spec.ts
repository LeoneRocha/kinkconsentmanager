import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  GroupDefinition,
  ItemResponseValue,
  OTHER_OPTION_VALUE,
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
      {
        id: 'item_safeword',
        type: 'single_choice',
        options: ['opt_a', 'opt_b'],
        allowOtherOption: true,
        maxLength: 120,
      },
      {
        id: 'item_aftercare',
        type: 'multiple_choice',
        options: ['opt_c', 'opt_d'],
        allowOtherOption: true,
        maxLength: 120,
      },
      {
        id: 'item_allergies',
        type: 'restricted_text',
        maxLength: 150,
      },
      { id: 'item_checkin', type: 'scale_matrix', dualRole: false },
    ],
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
    grp_safety: { title: 'Safety' },
    grp_bondage: { title: 'Bondage' },
  },
  items: {
    item_safeword: { label: 'Safeword', tooltip: 'Choose primary safeword.' },
    item_aftercare: { label: 'Aftercare' },
    item_allergies: { label: 'Allergies' },
    item_checkin: { label: 'Check-ins' },
    item_rope: { label: 'Rope Bondage' },
  },
  options: {
    opt_a: 'Option A',
    opt_b: 'Option B',
    opt_c: 'Option C',
    opt_d: 'Option D',
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

  // Cenário: Renderização minimalista incluindo escolhas únicas, múltiplas, texto restrito e escalas sem listas de contexto.
  // Objetivo: Garantir que apenas o item atual seja exibido e todos os tipos de pergunta componham a fila de passos.
  it('should render only the current step cleanly without prev/next context lists and include all question types', () => {
    const hostEl = fixture.nativeElement as HTMLElement;
    const counter = hostEl.querySelector('.quick-fill__counter');

    // item_safeword (1) + item_aftercare (1) + item_allergies (1) + item_checkin (1) + item_rope dualRole (2) => 6 steps
    expect(counter?.textContent?.trim()).toBe('1 / 6');
    expect(hostEl.querySelector('.quick-fill__current-item')?.textContent?.trim()).toBe('Safeword');
    expect(hostEl.querySelector('.quick-fill__current-desc')?.textContent?.trim()).toBe(
      'Choose primary safeword.',
    );
    expect(hostEl.querySelector('.quick-fill__context--prev')).toBeNull();
    expect(hostEl.querySelector('.quick-fill__context--next')).toBeNull();
    expect(hostEl.querySelectorAll('.quick-fill__option-btn').length).toBe(3);
  });

  // Cenário: Preenchimento de escolha única, múltipla escolha (com Outro) e texto restrito no Preenchimento Rápido.
  // Objetivo: Emitir answerChange corretamente para opções e manter Próximo verde quando o item atual está respondido.
  it('should support single_choice, multiple_choice with Other, and restricted_text inputs', async () => {
    const emitted: { itemId: string; patch: Partial<ItemResponseValue> }[] = [];
    component.answerChange.subscribe((val) => emitted.push(val));
    const hostEl = fixture.nativeElement as HTMLElement;

    // Step 1/6: single_choice -> key '1' selects opt_a and advances to Step 2/6 (multiple_choice)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    await fixture.whenStable();

    expect(emitted[0]).toEqual({
      itemId: 'item_safeword',
      patch: { selectedOption: 'opt_a', otherText: undefined },
    });
    expect(hostEl.querySelector('.quick-fill__counter')?.textContent?.trim()).toBe('2 / 6');
    expect(hostEl.querySelector('.quick-fill__current-item')?.textContent?.trim()).toBe(
      'Aftercare',
    );

    const nextBtn = hostEl.querySelector<HTMLButtonElement>('.quick-fill__next-btn')!;
    expect(nextBtn.classList.contains('quick-fill__next-btn--ready')).toBe(false);

    // Step 2/6: multiple_choice -> toggle opt_c & Other without auto-advancing
    const optionBtns = hostEl.querySelectorAll<HTMLButtonElement>('.quick-fill__option-btn');
    expect(optionBtns.length).toBe(3);

    optionBtns[0].click();
    await setBaseInputs({
      answers: { item_aftercare: { selectedOptions: ['opt_c'] } },
    });
    expect(emitted[1]).toEqual({
      itemId: 'item_aftercare',
      patch: { selectedOptions: ['opt_c'], otherText: undefined },
    });
    expect(hostEl.querySelector('.quick-fill__counter')?.textContent?.trim()).toBe('2 / 6');
    expect(nextBtn.classList.contains('quick-fill__next-btn--ready')).toBe(true);

    optionBtns[2].click();
    await setBaseInputs({
      answers: { item_aftercare: { selectedOptions: ['opt_c', OTHER_OPTION_VALUE] } },
    });
    const otherInput = hostEl.querySelector<HTMLInputElement>('.quick-fill__other-input')!;
    expect(otherInput).not.toBeNull();
    otherInput.value = 'Quiet time';
    otherInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(emitted[3]).toEqual({
      itemId: 'item_aftercare',
      patch: { selectedOptions: ['opt_c', OTHER_OPTION_VALUE], otherText: 'Quiet time' },
    });

    // Advance to Step 3/6 (restricted_text)
    nextBtn.click();
    await fixture.whenStable();
    expect(hostEl.querySelector('.quick-fill__counter')?.textContent?.trim()).toBe('3 / 6');
    expect(hostEl.querySelector('.quick-fill__current-item')?.textContent?.trim()).toBe(
      'Allergies',
    );

    const textarea = hostEl.querySelector<HTMLTextAreaElement>('.quick-fill__textarea')!;
    expect(textarea).not.toBeNull();
    textarea.value = 'Latex';
    textarea.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(emitted[4]).toEqual({
      itemId: 'item_allergies',
      patch: { customText: 'Latex' },
    });
  });

  // Cenário: Atalhos numéricos 1-5 e Numpad em itens de escala com autoavanço.
  // Objetivo: Emitir primaryScale/secondaryScale e avançar do passo 4 para os passos seguintes.
  it('should handle keyboard 1-5 (and Numpad) on scale_matrix steps by emitting answerChange and auto-advancing', async () => {
    const emitted: { itemId: string; patch: Partial<ItemResponseValue> }[] = [];
    component.answerChange.subscribe((val) => emitted.push(val));

    // Advance to Step 4/6 (item_checkin scale_matrix)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelector('.quick-fill__counter')?.textContent?.trim()).toBe('4 / 6');
    expect(hostEl.querySelector('.quick-fill__current-item')?.textContent?.trim()).toBe(
      'Check-ins',
    );
    expect(hostEl.querySelector('.quick-fill__current-role')?.textContent?.trim()).toBe('General');

    // Step 4/6: item_checkin (single-role) -> key '4' => enjoy
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '4' }));
    await fixture.whenStable();

    expect(emitted[0]).toEqual({ itemId: 'item_checkin', patch: { primaryScale: 'enjoy' } });
    expect(hostEl.querySelector('.quick-fill__counter')?.textContent?.trim()).toBe('5 / 6');
    expect(hostEl.querySelector('.quick-fill__current-item')?.textContent?.trim()).toBe(
      'Rope Bondage',
    );
    expect(hostEl.querySelector('.quick-fill__current-role')?.textContent?.trim()).toBe('Giving');

    // Step 5/6: item_rope primary -> Numpad5 => favorite, advances to item_rope secondary
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '5', code: 'Numpad5' }));
    await fixture.whenStable();

    expect(emitted[1]).toEqual({ itemId: 'item_rope', patch: { primaryScale: 'favorite' } });
    expect(hostEl.querySelector('.quick-fill__counter')?.textContent?.trim()).toBe('6 / 6');
    expect(hostEl.querySelector('.quick-fill__current-role')?.textContent?.trim()).toBe(
      'Receiving',
    );
  });

  // Cenário: Limpeza da resposta atual com tecla 0 sem avançar o índice.
  // Objetivo: Limpar secondaryScale do passo atual preservando a posição corrente.
  it('should clear current step answer on key 0 without advancing', async () => {
    await setBaseInputs({
      answers: {
        item_rope: { primaryScale: 'enjoy', secondaryScale: 'soft_limit' },
      },
    });

    const emitted: { itemId: string; patch: Partial<ItemResponseValue> }[] = [];
    component.answerChange.subscribe((val) => emitted.push(val));

    // Move to Step 6/6 (item_rope secondary)
    for (let i = 0; i < 5; i++) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    }
    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelector('.quick-fill__counter')?.textContent?.trim()).toBe('6 / 6');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '0' }));
    await fixture.whenStable();

    expect(emitted).toEqual([{ itemId: 'item_rope', patch: { secondaryScale: undefined } }]);
    expect(hostEl.querySelector('.quick-fill__counter')?.textContent?.trim()).toBe('6 / 6');
  });

  // Cenário: Navegação por teclado (ArrowUp/ArrowDown) respeitando limites.
  // Objetivo: Garantir que setas avancem/retrocedam dentro de [1..N] mesmo sem lista de contexto.
  it('should navigate between steps with ArrowUp/ArrowDown within bounds', async () => {
    const hostEl = fixture.nativeElement as HTMLElement;

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    await fixture.whenStable();
    expect(hostEl.querySelector('.quick-fill__counter')?.textContent?.trim()).toBe('2 / 6');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    await fixture.whenStable();
    expect(hostEl.querySelector('.quick-fill__counter')?.textContent?.trim()).toBe('1 / 6');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    await fixture.whenStable();
    expect(hostEl.querySelector('.quick-fill__counter')?.textContent?.trim()).toBe('1 / 6');
  });

  // Cenário: Fechamento do modal com Escape e bloqueio de atalhos quando oculto.
  // Objetivo: Emitir visibleChange(false) no Escape e ignorar teclas quando visible=false.
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

  // Cenário: Lista de grupos vazia após filtros.
  // Objetivo: Exibir estado vazio informativo quando não houver nenhum item para preencher.
  it('should render empty state when groups list is empty', async () => {
    await setBaseInputs({ groups: [] });

    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelector('.quick-fill')).toBeNull();
    expect(hostEl.querySelector('.quick-fill__empty')?.textContent).toContain(
      'Não há itens disponíveis',
    );
  });
});
