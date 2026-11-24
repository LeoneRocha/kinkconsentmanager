import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import {
  ItemDefinition,
  ItemResponseValue,
  OTHER_OPTION_VALUE,
  ResolvedRolePairLabels,
  ScaleOption,
} from '../../../core/models';
import { UiFeedbackHostService } from '../../../core/services';
import { DynamicQuestionItemComponent } from './dynamic-question-item.component';

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

const MOCK_SCALE_LABELS: Readonly<Record<string, string>> = {
  hard_limit: 'Hard Limit',
  soft_limit: 'Soft Limit',
  curious: 'Curious',
  enjoy: 'Enjoy',
  favorite: 'Favorite',
};

const MOCK_OPTION_LABELS: Readonly<Record<string, string>> = {
  opt_a: 'Option A',
  opt_b: 'Option B',
  opt_c: 'Option C',
};

const DUAL_ROLE_LABELS: ResolvedRolePairLabels = {
  primary: 'Giving',
  secondary: 'Receiving',
};

const SINGLE_ROLE_LABELS: ResolvedRolePairLabels = {
  primary: 'General',
};

describe('DynamicQuestionItemComponent', () => {
  let fixture: ComponentFixture<DynamicQuestionItemComponent>;
  let component: DynamicQuestionItemComponent;

  const setBaseInputs = async (
    item: ItemDefinition,
    overrides?: {
      isDualRole?: boolean;
      roleLabels?: ResolvedRolePairLabels;
      itemLabel?: string;
      itemTooltip?: string;
      answer?: ItemResponseValue;
    },
  ): Promise<void> => {
    fixture.componentRef.setInput('item', item);
    fixture.componentRef.setInput('scales', MOCK_SCALES);
    fixture.componentRef.setInput('isDualRole', overrides?.isDualRole ?? false);
    fixture.componentRef.setInput('roleLabels', overrides?.roleLabels ?? SINGLE_ROLE_LABELS);
    fixture.componentRef.setInput('itemLabel', overrides?.itemLabel ?? 'Question Label');
    fixture.componentRef.setInput('itemTooltip', overrides?.itemTooltip ?? '');
    fixture.componentRef.setInput('scaleLabels', MOCK_SCALE_LABELS);
    fixture.componentRef.setInput('optionLabels', MOCK_OPTION_LABELS);
    fixture.componentRef.setInput('otherLabel', 'Other');
    fixture.componentRef.setInput('otherPlaceholder', 'Please specify...');
    fixture.componentRef.setInput('answer', overrides?.answer);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicQuestionItemComponent],
      providers: [provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' })],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', {
      ui: {
        notificationOkAction: 'OK',
      },
    });

    fixture = TestBed.createComponent(DynamicQuestionItemComponent);
    component = fixture.componentInstance;
  });

  it('should render two scale selectors and emit primaryScale and secondaryScale independently for dual-role scale_matrix', async () => {
    await setBaseInputs(
      { id: 'rope_bondage', type: 'scale_matrix', dualRole: true },
      { isDualRole: true, roleLabels: DUAL_ROLE_LABELS },
    );

    const hostEl = fixture.nativeElement as HTMLElement;
    const selectors = hostEl.querySelectorAll('app-scale-selector');
    expect(selectors.length).toBe(2);

    const emitted: Partial<ItemResponseValue>[] = [];
    component.answerChange.subscribe((val) => emitted.push(val));

    const primaryButtons = selectors[0].querySelectorAll<HTMLButtonElement>('button[role="radio"]');
    const secondaryButtons = selectors[1].querySelectorAll<HTMLButtonElement>('button[role="radio"]');

    primaryButtons[3].click();
    secondaryButtons[4].click();

    expect(emitted).toEqual([{ primaryScale: 'enjoy' }, { secondaryScale: 'favorite' }]);
  });

  it('should render one scale selector and emit primaryScale for single-role scale_matrix', async () => {
    await setBaseInputs(
      { id: 'roleplay_public', type: 'scale_matrix', dualRole: false },
      { isDualRole: false, roleLabels: SINGLE_ROLE_LABELS },
    );

    const hostEl = fixture.nativeElement as HTMLElement;
    const selectors = hostEl.querySelectorAll('app-scale-selector');
    expect(selectors.length).toBe(1);

    const emitSpy = jest.fn<void, [Partial<ItemResponseValue>]>();
    component.answerChange.subscribe(emitSpy);

    const buttons = selectors[0].querySelectorAll<HTMLButtonElement>('button[role="radio"]');
    buttons[2].click();

    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith({ primaryScale: 'curious' });
  });

  it('should render radio options and emit selectedOption for single_choice', async () => {
    await setBaseInputs({
      id: 'aftercare_pref',
      type: 'single_choice',
      options: ['opt_a', 'opt_b'],
    });

    const hostEl = fixture.nativeElement as HTMLElement;
    const radios = hostEl.querySelectorAll<HTMLInputElement>('mat-radio-button input[type="radio"]');
    expect(radios.length).toBe(2);

    const emitSpy = jest.fn<void, [Partial<ItemResponseValue>]>();
    component.answerChange.subscribe(emitSpy);

    radios[1].click();
    await fixture.whenStable();

    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith({ selectedOption: 'opt_b' });
  });

  it('should toggle options and emit updated selectedOptions for multiple_choice', async () => {
    await setBaseInputs(
      {
        id: 'safeword_methods',
        type: 'multiple_choice',
        options: ['opt_a', 'opt_b', 'opt_c'],
      },
      { answer: { selectedOptions: ['opt_a'] } },
    );

    const hostEl = fixture.nativeElement as HTMLElement;
    const checkboxes = hostEl.querySelectorAll<HTMLInputElement>(
      'mat-checkbox input[type="checkbox"]',
    );
    expect(checkboxes.length).toBe(3);

    const emitted: Partial<ItemResponseValue>[] = [];
    component.answerChange.subscribe((val) => emitted.push(val));

    // Check opt_b
    checkboxes[1].click();
    await fixture.whenStable();
    expect(emitted[0]).toEqual({ selectedOptions: ['opt_a', 'opt_b'] });

    // Simulate parent updating answer, then uncheck opt_a
    fixture.componentRef.setInput('answer', { selectedOptions: ['opt_a', 'opt_b'] });
    await fixture.whenStable();

    checkboxes[0].click();
    await fixture.whenStable();
    expect(emitted[1]).toEqual({ selectedOptions: ['opt_b'] });
  });

  it('should reveal other input and emit otherText when allowOtherOption is enabled and selected', async () => {
    // 1) single_choice with allowOtherOption
    await setBaseInputs(
      {
        id: 'checkin_style',
        type: 'single_choice',
        options: ['opt_a'],
        allowOtherOption: true,
      },
      { answer: undefined },
    );

    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelector('input.question-item__text-input')).toBeNull();

    const emittedSingle: Partial<ItemResponseValue>[] = [];
    const sub1 = component.answerChange.subscribe((val) => emittedSingle.push(val));

    const radios = hostEl.querySelectorAll<HTMLInputElement>('mat-radio-button input[type="radio"]');
    expect(radios.length).toBe(2);
    radios[1].click();
    await fixture.whenStable();

    expect(emittedSingle[0]).toEqual({ selectedOption: OTHER_OPTION_VALUE, otherText: '' });

    // Reflect answer back into input to reveal text field
    fixture.componentRef.setInput('answer', { selectedOption: OTHER_OPTION_VALUE, otherText: '' });
    await fixture.whenStable();

    const singleOtherInput = hostEl.querySelector<HTMLInputElement>('input.question-item__text-input');
    expect(singleOtherInput).not.toBeNull();
    singleOtherInput!.value = 'Custom protocol';
    singleOtherInput!.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();

    expect(emittedSingle[1]).toEqual({
      selectedOption: OTHER_OPTION_VALUE,
      otherText: 'Custom protocol',
    });
    sub1.unsubscribe();

    // 2) multiple_choice with allowOtherOption
    await setBaseInputs(
      {
        id: 'toys_material',
        type: 'multiple_choice',
        options: ['opt_a'],
        allowOtherOption: true,
      },
      { answer: { selectedOptions: ['opt_a', OTHER_OPTION_VALUE], otherText: 'Wood' } },
    );

    const emittedMulti: Partial<ItemResponseValue>[] = [];
    component.answerChange.subscribe((val) => emittedMulti.push(val));

    const multiOtherInput = hostEl.querySelector<HTMLInputElement>('input.question-item__text-input');
    expect(multiOtherInput).not.toBeNull();
    multiOtherInput!.value = 'Leather';
    multiOtherInput!.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();

    expect(emittedMulti[0]).toEqual({
      selectedOptions: ['opt_a', OTHER_OPTION_VALUE],
      otherText: 'Leather',
    });
  });

  it('should enforce maxLength and update live character counter for restricted_text', async () => {
    await setBaseInputs(
      {
        id: 'additional_notes',
        type: 'restricted_text',
        maxLength: 20,
      },
      { answer: { customText: 'Hello' } },
    );

    const hostEl = fixture.nativeElement as HTMLElement;
    const textarea = hostEl.querySelector<HTMLTextAreaElement>('textarea.question-item__textarea');
    const counter = hostEl.querySelector('.question-item__counter');

    expect(textarea).not.toBeNull();
    expect(textarea?.getAttribute('maxlength')).toBe('20');
    expect(counter?.textContent?.trim()).toBe('5 / 20');

    const emitted: Partial<ItemResponseValue>[] = [];
    component.answerChange.subscribe((val) => emitted.push(val));

    textarea!.value = '1234567890123456789012345';
    textarea!.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();

    expect(emitted[0]).toEqual({ customText: '12345678901234567890' });
  });

  it('should conditionally render tooltip info icon only when itemTooltip is non-empty', async () => {
    await setBaseInputs(
      { id: 'item_no_tip', type: 'scale_matrix' },
      { itemTooltip: '   ' },
    );

    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelector('.fa-circle-info')).toBeNull();

    fixture.componentRef.setInput('itemTooltip', 'Helpful safety explanation');
    await fixture.whenStable();

    const icon = hostEl.querySelector('.fa-circle-info');
    expect(icon).not.toBeNull();
    const triggerBtn = hostEl.querySelector('.question-item__tooltip-btn');
    expect(triggerBtn?.getAttribute('aria-label')).toBe('Helpful safety explanation');
  });

  // Cenário: Clique no botão de leitura em voz alta do item.
  // Objetivo: Emitir o evento readAloud mantendo rótulo acessível com o nome do item.
  it('should render speak button with accessible label and emit readAloud on click', async () => {
    await setBaseInputs(
      { id: 'item_tts', type: 'scale_matrix' },
      { itemLabel: 'Rope Bondage' },
    );

    const speakEmitSpy = jest.fn<void, []>();
    component.readAloud.subscribe(speakEmitSpy);

    const speakBtn = fixture.nativeElement.querySelector(
      '.question-item__speak-btn',
    ) as HTMLButtonElement;
    expect(speakBtn).not.toBeNull();
    expect(speakBtn.getAttribute('aria-label')).toContain('Rope Bondage');

    speakBtn.click();
    expect(speakEmitSpy).toHaveBeenCalledTimes(1);
  });

  it('should open feedback modal popup via UiFeedbackHostService with description when clicking the info button', async () => {
    await setBaseInputs(
      { id: 'item_info_popup', type: 'scale_matrix' },
      { itemLabel: 'Rope Bondage', itemTooltip: 'Helpful safety explanation' },
    );

    const feedbackHost = fixture.debugElement.injector.get(UiFeedbackHostService);
    const modalSpy = jest.spyOn(feedbackHost, 'modalAlert').mockReturnValue(of(true));

    const infoBtn = fixture.nativeElement.querySelector(
      '.question-item__tooltip-btn',
    ) as HTMLButtonElement;
    expect(infoBtn).not.toBeNull();
    infoBtn.click();

    expect(modalSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Rope Bondage',
        message: 'Helpful safety explanation',
        icon: 'fa-solid fa-circle-info',
      }),
    );
  });
});
