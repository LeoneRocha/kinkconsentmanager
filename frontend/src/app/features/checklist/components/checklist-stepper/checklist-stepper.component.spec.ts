import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  GroupDefinition,
  ItemResponseValue,
  ResolvedPreviewTexts,
  ScaleOption,
} from '../../../../core/models';
import { ChecklistStepperComponent } from './checklist-stepper.component';

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
    items: [{ id: 'item_safeword', type: 'single_choice', options: ['opt_traffic'] }],
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
  },
};

describe('ChecklistStepperComponent', () => {
  let fixture: ComponentFixture<ChecklistStepperComponent>;
  let component: ChecklistStepperComponent;

  const setBaseInputs = async (overrides?: {
    groups?: readonly GroupDefinition[];
    activeStep?: number;
    answers?: Readonly<Record<string, ItemResponseValue>>;
  }): Promise<void> => {
    fixture.componentRef.setInput('groups', overrides?.groups ?? MOCK_GROUPS);
    fixture.componentRef.setInput('scales', MOCK_SCALES);
    fixture.componentRef.setInput('answers', overrides?.answers ?? {});
    fixture.componentRef.setInput('activeStep', overrides?.activeStep ?? 0);
    fixture.componentRef.setInput('texts', MOCK_TEXTS);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChecklistStepperComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChecklistStepperComponent);
    component = fixture.componentInstance;
    await setBaseInputs();
  });

  // Cenário: Renderização inicial do stepper com passos numerados e etapa final de revisão.
  // Objetivo: Garantir navegação entre passos via botões e seleção direta na barra superior.
  it('should render yellow active step, block advance & show red invalid state until filled, turn green on completion, and allow advance', async () => {
    const emittedSteps: number[] = [];
    component.activeStepChange.subscribe((step) => emittedSteps.push(step));

    const hostEl = fixture.nativeElement as HTMLElement;
    const stepTabs = hostEl.querySelectorAll('.stepper__step-btn');
    expect(stepTabs.length).toBe(3);

    const rail = hostEl.querySelector('.stepper__rail');
    const legendContainer = hostEl.querySelector('.stepper__legend');
    const legendBar = legendContainer?.querySelector('app-legend-bar') ?? null;
    const tabpanel = hostEl.querySelector('[role="tabpanel"]');
    expect(rail).not.toBeNull();
    expect(legendBar).not.toBeNull();
    expect(tabpanel).not.toBeNull();
    expect(
      Boolean(rail!.compareDocumentPosition(legendContainer!) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);
    expect(
      Boolean(
        legendContainer!.compareDocumentPosition(tabpanel!) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);

    expect(stepTabs[0].classList.contains('stepper__step-btn--active')).toBe(true);
    expect(hostEl.querySelector('.stepper__panel-title')?.textContent).toContain('Safety & Health');

    const prevBtn = hostEl.querySelector<HTMLButtonElement>('.stepper__prev-btn');
    expect(prevBtn?.disabled).toBe(true);

    // Attempt advance while Step 1 is incomplete -> blocked & marks Step 1 red/invalid; review jump disabled
    const reviewJumpBtn = hostEl.querySelector<HTMLButtonElement>('.stepper__review-jump-btn');
    expect(reviewJumpBtn?.disabled).toBe(true);
    hostEl.querySelector<HTMLButtonElement>('.stepper__next-btn')?.click();
    await fixture.whenStable();
    expect(emittedSteps).toEqual([]);
    expect(stepTabs[0].classList.contains('stepper__step-btn--invalid')).toBe(true);
    expect(hostEl.querySelector('.stepper__validation-alert')).not.toBeNull();

    // Fill Step 1 -> turns green and clears alert, allowing Next Step
    fixture.componentRef.setInput('answers', {
      item_safeword: { selectedOption: 'opt_traffic' },
    });
    await fixture.whenStable();
    expect(stepTabs[0].classList.contains('stepper__step-btn--done')).toBe(true);
    expect(hostEl.querySelector('.stepper__validation-alert')).toBeNull();

    hostEl.querySelector<HTMLButtonElement>('.stepper__next-btn')?.click();
    await fixture.whenStable();
    expect(emittedSteps).toEqual([1]);

    // Move to Step 2 and fill it -> Review step becomes accessible
    fixture.componentRef.setInput('activeStep', 1);
    fixture.componentRef.setInput('answers', {
      item_safeword: { selectedOption: 'opt_traffic' },
      item_rope: { primaryScale: 'enjoy' },
    });
    await fixture.whenStable();

    (stepTabs[2] as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(emittedSteps).toEqual([1, 2]);
  });

  // Cenário: Entrada no passo final de Revisão Final.
  // Objetivo: Exibir todas as categorias em accordion expandido por padrão e exigir tudo preenchido para habilitar Finalizar.
  it('should display all categories expanded in accordion on the final review step and enable finish in green only when completed', async () => {
    await setBaseInputs({ activeStep: 2 });

    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelector('mat-accordion')).not.toBeNull();

    const panels = Array.from(hostEl.querySelectorAll('mat-expansion-panel'));
    expect(panels.length).toBe(2);
    expect(panels.every((p) => p.classList.contains('mat-expanded'))).toBe(true);

    hostEl.querySelector<HTMLButtonElement>('.stepper__collapse-all-btn')?.click();
    await fixture.whenStable();
    expect(panels.some((p) => p.classList.contains('mat-expanded'))).toBe(false);

    hostEl.querySelector<HTMLButtonElement>('.stepper__expand-all-btn')?.click();
    await fixture.whenStable();
    expect(panels.every((p) => p.classList.contains('mat-expanded'))).toBe(true);

    const finishBtn = hostEl.querySelector<HTMLButtonElement>('.stepper__finish-btn')!;
    expect(finishBtn.disabled).toBe(true);
    expect(finishBtn.classList.contains('stepper__ready-btn')).toBe(false);

    await setBaseInputs({
      activeStep: 2,
      answers: {
        item_safeword: { selectedOption: 'opt_traffic' },
        item_rope: { primaryScale: 'enjoy' },
      },
    });
    expect(finishBtn.disabled).toBe(false);
    expect(finishBtn.classList.contains('stepper__ready-btn')).toBe(true);

    const finishSpy = jest.fn<void, []>();
    component.finishChecklist.subscribe(finishSpy);
    finishBtn.click();
    expect(finishSpy).toHaveBeenCalledTimes(1);
  });

  // Cenário: Filtro sem resultados no modo Stepper.
  // Objetivo: Renderizar estado vazio acessível com mensagem informativa.
  it('should render empty state when groups list is empty', async () => {
    await setBaseInputs({ groups: [] });

    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelector('.stepper__empty')).not.toBeNull();
    expect(hostEl.querySelector('.stepper__rail')).toBeNull();
  });
});
