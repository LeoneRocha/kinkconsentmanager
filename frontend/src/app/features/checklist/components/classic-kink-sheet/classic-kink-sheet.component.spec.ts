import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import {
  GroupDefinition,
  ItemDefinition,
  ItemResponseValue,
  ResolvedPreviewTexts,
  ScaleOption,
} from '../../../../core/models';
import { UiFeedbackHostService } from '../../../../core/services';
import { ClassicKinkSheetComponent } from './classic-kink-sheet.component';

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
    items: [{ id: 'item_safeword', type: 'single_choice', options: ['opt_traffic'] }],
  },
  {
    id: 'grp_bondage',
    order: 2,
    defaultDualRole: true,
    rolePairId: 'giving_receiving',
    items: [
      { id: 'item_rope', type: 'scale_matrix', dualRole: true },
      { id: 'item_cuffs', type: 'scale_matrix', dualRole: false },
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
    grp_safety: { title: 'Safety', description: 'Pre-scene rules.' },
    grp_bondage: { title: 'Bondage', description: 'Ropes & cuffs.' },
  },
  items: {
    item_safeword: { label: 'Safeword' },
    item_rope: { label: 'Rope Bondage' },
    item_cuffs: { label: 'Handcuffs' },
  },
  options: {
    opt_traffic: 'Traffic Light',
  },
};

describe('ClassicKinkSheetComponent', () => {
  let fixture: ComponentFixture<ClassicKinkSheetComponent>;
  let component: ClassicKinkSheetComponent;

  const setBaseInputs = async (overrides?: {
    groups?: readonly GroupDefinition[];
    answers?: Readonly<Record<string, ItemResponseValue>>;
  }): Promise<void> => {
    fixture.componentRef.setInput('groups', overrides?.groups ?? MOCK_GROUPS);
    fixture.componentRef.setInput('scales', MOCK_SCALES);
    fixture.componentRef.setInput('answers', overrides?.answers ?? {});
    fixture.componentRef.setInput('texts', MOCK_TEXTS);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClassicKinkSheetComponent],
      providers: [provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' })],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', {
      ui: {
        notificationOkAction: 'OK',
      },
    });

    fixture = TestBed.createComponent(ClassicKinkSheetComponent);
    component = fixture.componentInstance;
    await setBaseInputs();
  });

  // Cenário: Renderização clássica em blocos agrupados com divisores e papéis.
  // Objetivo: Garantir que cada categoria seja renderizada em bloco com seletores compactos e itens complexos integrados.
  it('should render grouped category blocks, item title before Giving/Receiving dots, and complex items', () => {
    const hostEl = fixture.nativeElement as HTMLElement;
    const blocks = hostEl.querySelectorAll('.classic-block');
    expect(blocks.length).toBe(2);

    expect(hostEl.querySelectorAll('.classic-block__roles').length).toBe(1);
    expect(hostEl.querySelectorAll('app-dynamic-question-item').length).toBe(1);
    expect(hostEl.querySelectorAll('.classic-row__dot-group').length).toBe(3);

    const firstMatrixRow = hostEl.querySelector('.classic-row:not(.classic-row--complex)')!;
    const children = Array.from(firstMatrixRow.children).map((el) => el.className);
    expect(children[0]).toContain('classic-row__item-meta');
    expect(children[1]).toContain('classic-row__scales');
    expect(firstMatrixRow.textContent).toContain('Giving');
    expect(firstMatrixRow.textContent).toContain('Receiving');
  });

  // Cenário: Clique nos círculos de escala no modo Clássico para marcar e limpar resposta.
  // Objetivo: Emitir answerChange com primaryScale/secondaryScale e alternar para undefined ao clicar novamente.
  it('should select and toggle scale circles on click and emit readItemAloud and finishChecklist', async () => {
    const emitted: { itemId: string; patch: Partial<ItemResponseValue> }[] = [];
    component.answerChange.subscribe((ev) => emitted.push(ev));

    const hostEl = fixture.nativeElement as HTMLElement;
    const dotGroups = hostEl.querySelectorAll('.classic-row__dot-group');
    const primaryDots = dotGroups[0].querySelectorAll<HTMLButtonElement>('.classic-row__dot');

    primaryDots[3].click();
    expect(emitted[0]).toEqual({ itemId: 'item_rope', patch: { primaryScale: 'enjoy' } });

    await setBaseInputs({
      answers: { item_rope: { primaryScale: 'enjoy' } },
    });

    const refreshedPrimaryDots = hostEl
      .querySelectorAll('.classic-row__dot-group')[0]
      .querySelectorAll<HTMLButtonElement>('.classic-row__dot');
    refreshedPrimaryDots[3].click();
    expect(emitted[1]).toEqual({ itemId: 'item_rope', patch: { primaryScale: undefined } });

    const spoken: ItemDefinition[] = [];
    component.readItemAloud.subscribe((item) => spoken.push(item));
    hostEl.querySelector<HTMLButtonElement>('.classic-row__speak-btn')?.click();
    expect(spoken.map((i) => i.id)).toEqual(['item_rope']);

    const finishSpy = jest.fn<void, []>();
    component.finishChecklist.subscribe(finishSpy);
    hostEl.querySelector<HTMLButtonElement>('.classic-sheet__finish-btn')?.click();
    expect(finishSpy).toHaveBeenCalledTimes(1);
  });

  // Cenário: Lista vazia após filtragem no modo Clássico.
  // Objetivo: Exibir aviso vazio sem blocos de categoria.
  it('should render empty state when filtered groups list is empty', async () => {
    await setBaseInputs({ groups: [] });

    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelector('.classic-sheet__empty')).not.toBeNull();
    expect(hostEl.querySelector('.classic-block')).toBeNull();
  });

  it('should open feedback modal popup via UiFeedbackHostService with category description when clicking group info button', () => {
    const feedbackHost = fixture.debugElement.injector.get(UiFeedbackHostService);
    const modalSpy = jest.spyOn(feedbackHost, 'modalAlert').mockReturnValue(of(true));

    const hostEl = fixture.nativeElement as HTMLElement;
    const infoBtn = hostEl.querySelector<HTMLButtonElement>('.classic-block__info-btn');
    expect(infoBtn).not.toBeNull();
    infoBtn!.click();

    expect(modalSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Safety',
        message: 'Pre-scene rules.',
        icon: 'fa-solid fa-circle-info',
      }),
    );
  });

  // Cenário: Expansão e recolhimento individual e global das categorias no Modo Clássico.
  // Objetivo: Garantir alternância pelo botão/cabeçalho sem colapsar ao abrir o botão de info, usando fa-angles-up/down.
  it('should collapse and expand individual blocks and all blocks without collapsing on info button click', async () => {
    const feedbackHost = fixture.debugElement.injector.get(UiFeedbackHostService);
    jest.spyOn(feedbackHost, 'modalAlert').mockReturnValue(of(true));

    const hostEl = fixture.nativeElement as HTMLElement;
    const toggleAllBtn = hostEl.querySelector<HTMLButtonElement>('.classic-sheet__toggle-all-btn')!;
    const blockToggleBtns = Array.from(
      hostEl.querySelectorAll<HTMLButtonElement>('.classic-block__toggle-btn'),
    );
    const blockHeaders = Array.from(hostEl.querySelectorAll<HTMLElement>('.classic-block__header'));
    const blocks = Array.from(hostEl.querySelectorAll<HTMLElement>('.classic-block'));

    expect(toggleAllBtn.getAttribute('aria-expanded')).toBe('true');
    expect(toggleAllBtn.querySelector('i.fa-angles-up')).not.toBeNull();
    expect(blockToggleBtns.length).toBe(2);
    expect(blockToggleBtns.every((b) => b.querySelector('i.fa-angles-up') !== null)).toBe(true);

    // Clicar no botão info não deve recolher o bloco
    hostEl.querySelector<HTMLButtonElement>('.classic-block__info-btn')!.click();
    await fixture.whenStable();
    expect(blockToggleBtns[0].getAttribute('aria-expanded')).toBe('true');
    expect(blocks[0].querySelector('.classic-block__rows')).not.toBeNull();

    // Recolher bloco individual pelo botão
    blockToggleBtns[1].click();
    await fixture.whenStable();
    expect(blockToggleBtns[1].getAttribute('aria-expanded')).toBe('false');
    expect(blockToggleBtns[1].querySelector('i.fa-angles-down')).not.toBeNull();
    expect(blocks[1].querySelector('.classic-block__roles')).toBeNull();
    expect(blocks[1].querySelector('.classic-block__rows')).toBeNull();
    expect(toggleAllBtn.getAttribute('aria-expanded')).toBe('false');
    expect(toggleAllBtn.querySelector('i.fa-angles-down')).not.toBeNull();

    // Expandir novamente pelo cabeçalho do bloco
    blockHeaders[1].click();
    await fixture.whenStable();
    expect(blockToggleBtns[1].getAttribute('aria-expanded')).toBe('true');
    expect(blocks[1].querySelector('.classic-block__rows')).not.toBeNull();
    expect(toggleAllBtn.getAttribute('aria-expanded')).toBe('true');
    expect(toggleAllBtn.querySelector('i.fa-angles-up')).not.toBeNull();

    // Recolher e expandir tudo pelo botão global
    toggleAllBtn.click();
    await fixture.whenStable();
    expect(blocks.every((b) => b.querySelector('.classic-block__rows') === null)).toBe(true);
    expect(toggleAllBtn.querySelector('i.fa-angles-down')).not.toBeNull();

    toggleAllBtn.click();
    await fixture.whenStable();
    expect(blocks.every((b) => b.querySelector('.classic-block__rows') !== null)).toBe(true);
    expect(toggleAllBtn.querySelector('i.fa-angles-up')).not.toBeNull();
  });
});
