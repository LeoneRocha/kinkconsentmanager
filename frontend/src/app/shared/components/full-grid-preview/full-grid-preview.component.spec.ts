import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ChecklistSchema,
  ItemResponseValue,
  OTHER_OPTION_VALUE,
  ResolvedPreviewTexts,
} from '../../../core/models';
import { FullGridPreviewComponent } from './full-grid-preview.component';

const MOCK_SCHEMA: ChecklistSchema = {
  schemaVersion: '1.0.0',
  scales: [
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
  ],
  groups: [
    {
      id: 'group_general',
      order: 2,
      defaultDualRole: false,
      rolePairId: 'general',
      items: [
        { id: 'item_single_scale', type: 'scale_matrix', dualRole: false },
        {
          id: 'item_multi',
          type: 'multiple_choice',
          options: ['opt_verbal', 'opt_gestural'],
          allowOtherOption: true,
        },
        {
          id: 'item_single_choice',
          type: 'single_choice',
          options: ['opt_always', 'opt_sometimes'],
          allowOtherOption: true,
        },
        {
          id: 'item_notes',
          type: 'restricted_text',
          maxLength: 300,
        },
      ],
    },
    {
      id: 'group_bondage',
      order: 1,
      defaultDualRole: true,
      rolePairId: 'giving_receiving',
      items: [
        { id: 'item_rope', type: 'scale_matrix' },
        { id: 'item_blindfold', type: 'scale_matrix', dualRole: true },
      ],
    },
  ],
};

const MOCK_TEXTS: ResolvedPreviewTexts = {
  title: 'Checklist de Consentimento',
  schemaVersionLabel: 'Versão do Schema',
  generatedAtLabel: 'Gerado em',
  generatedAtValue: '2026-11-22 18:30',
  notAnsweredLabel: 'Não respondido',
  otherLabel: 'Outro',
  scales: {
    hard_limit: 'Limite Rígido',
    soft_limit: 'Limite Flexível',
    curious: 'Curioso',
    enjoy: 'Gosto',
    favorite: 'Favorito',
  },
  roles: {
    giving_receiving: { primary: 'Ativo', secondary: 'Passivo' },
    general: { primary: 'Geral' },
  },
  groups: {
    group_bondage: { title: 'Bondage', description: 'Práticas de contenção' },
    group_general: { title: 'Comunicação & Notas' },
  },
  items: {
    item_rope: { label: 'Cordas (Shibari)' },
    item_blindfold: { label: 'Vendas' },
    item_single_scale: { label: 'Conversa pós-cena' },
    item_multi: { label: 'Sinais de segurança' },
    item_single_choice: { label: 'Frequência de check-in' },
    item_notes: { label: 'Observações adicionais' },
  },
  options: {
    opt_verbal: 'Palavra de segurança',
    opt_gestural: 'Sinal gestual',
    opt_always: 'Sempre',
    opt_sometimes: 'Às vezes',
  },
};

describe('FullGridPreviewComponent', () => {
  let fixture: ComponentFixture<FullGridPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FullGridPreviewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FullGridPreviewComponent);
    fixture.componentRef.setInput('schema', MOCK_SCHEMA);
    fixture.componentRef.setInput('texts', MOCK_TEXTS);
    fixture.componentRef.setInput('answers', {});
    await fixture.whenStable();
  });

  it('should render metadata header, top legend, and groups vertically in schema order', () => {
    const hostEl = fixture.nativeElement as HTMLElement;

    expect(hostEl.querySelector('.full-grid-preview__title')?.textContent?.trim()).toBe(
      'Checklist de Consentimento',
    );
    expect(hostEl.textContent).not.toContain('Versão do Schema');
    expect(hostEl.textContent).not.toContain('1.0.0');
    expect(hostEl.textContent).toContain('2026-11-22 18:30');
    expect(hostEl.querySelector('app-legend-bar')).not.toBeNull();

    const groups = hostEl.querySelectorAll<HTMLElement>('.preview-group');
    expect(groups.length).toBe(2);
    expect(groups[0].getAttribute('data-group-id')).toBe('group_bondage');
    expect(groups[1].getAttribute('data-group-id')).toBe('group_general');
  });

  it('should render dual-role columns for dual-role groups and single value column for single-role groups', async () => {
    const answers: Readonly<Record<string, ItemResponseValue>> = {
      item_rope: { primaryScale: 'enjoy', secondaryScale: 'favorite' },
      item_single_scale: { primaryScale: 'curious' },
    };
    fixture.componentRef.setInput('answers', answers);
    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;
    const bondageGroup = hostEl.querySelector('[data-group-id="group_bondage"]')!;
    const bondageHeaders = bondageGroup.querySelectorAll('thead th');
    expect(bondageHeaders.length).toBe(2);
    expect(bondageHeaders[0].textContent?.trim()).toBe('Ativo');
    expect(bondageHeaders[1].textContent?.trim()).toBe('Passivo');

    const ropeRow = bondageGroup.querySelector('[data-item-id="item_rope"]')!;
    const ropeCells = ropeRow.querySelectorAll('td.preview-row__value--dual');
    expect(ropeCells.length).toBe(2);
    expect(ropeCells[0].textContent).toContain('Gosto');
    expect(ropeCells[1].textContent).toContain('Favorito');

    const generalGroup = hostEl.querySelector('[data-group-id="group_general"]')!;
    expect(generalGroup.querySelector('thead')).toBeNull();

    const singleScaleRow = generalGroup.querySelector('[data-item-id="item_single_scale"]')!;
    const singleCells = singleScaleRow.querySelectorAll('td.preview-row__value--single');
    expect(singleCells.length).toBe(1);
    expect(singleCells[0].textContent).toContain('Curioso');
  });

  it('should format multiple_choice, otherText, single_choice, and restricted_text answers', async () => {
    const answers: Readonly<Record<string, ItemResponseValue>> = {
      item_multi: {
        selectedOptions: ['opt_verbal', OTHER_OPTION_VALUE],
        otherText: 'Bolinha na mão',
      },
      item_single_choice: {
        selectedOption: OTHER_OPTION_VALUE,
        otherText: 'A cada 15 min',
      },
      item_notes: {
        customText: 'Sempre hidratar após a cena.',
      },
    };
    fixture.componentRef.setInput('answers', answers);
    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;

    const multiRow = hostEl.querySelector('[data-item-id="item_multi"]')!;
    expect(multiRow.textContent).toContain('Palavra de segurança, Outro: Bolinha na mão');

    const singleChoiceRow = hostEl.querySelector('[data-item-id="item_single_choice"]')!;
    expect(singleChoiceRow.textContent).toContain('Outro: A cada 15 min');

    const notesRow = hostEl.querySelector('[data-item-id="item_notes"]')!;
    expect(notesRow.textContent).toContain('Sempre hidratar após a cena.');
  });

  it('should display notAnsweredLabel for unanswered items across all question types', () => {
    const hostEl = fixture.nativeElement as HTMLElement;

    const ropeRow = hostEl.querySelector('[data-item-id="item_rope"]')!;
    const ropeUnanswered = ropeRow.querySelectorAll('.preview-unanswered');
    expect(ropeUnanswered.length).toBe(2);
    expect(ropeUnanswered[0].textContent?.trim()).toBe('Não respondido');
    expect(ropeUnanswered[1].textContent?.trim()).toBe('Não respondido');

    const multiRow = hostEl.querySelector('[data-item-id="item_multi"]')!;
    expect(multiRow.querySelector('.preview-unanswered')?.textContent?.trim()).toBe(
      'Não respondido',
    );

    const notesRow = hostEl.querySelector('[data-item-id="item_notes"]')!;
    expect(notesRow.querySelector('.preview-unanswered')?.textContent?.trim()).toBe(
      'Não respondido',
    );
  });

  it('should apply printMode modifier class when printMode is true', async () => {
    const hostEl = fixture.nativeElement as HTMLElement;
    const article = hostEl.querySelector('.full-grid-preview')!;
    expect(article.classList.contains('full-grid-preview--print')).toBe(false);

    fixture.componentRef.setInput('printMode', true);
    await fixture.whenStable();

    expect(article.classList.contains('full-grid-preview--print')).toBe(true);
  });

  it('should render the classic multi-column circle layout when layout is classic', async () => {
    const answers: Readonly<Record<string, ItemResponseValue>> = {
      item_rope: { primaryScale: 'enjoy', secondaryScale: 'favorite' },
      item_single_scale: { primaryScale: 'curious' },
      item_multi: {
        selectedOptions: ['opt_verbal', OTHER_OPTION_VALUE],
        otherText: 'Bolinha na mão',
      },
      item_notes: { customText: 'Sempre hidratar após a cena.' },
    };
    fixture.componentRef.setInput('answers', answers);
    fixture.componentRef.setInput('layout', 'classic');
    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;
    const article = hostEl.querySelector('.full-grid-preview')!;
    expect(article.classList.contains('full-grid-preview--classic')).toBe(true);
    expect(hostEl.querySelector('app-legend-bar')).toBeNull();

    const legendDots = hostEl.querySelectorAll('.classic-preview__legend-dot');
    expect(legendDots.length).toBe(6);

    const ropeDots = hostEl.querySelectorAll(
      '[data-item-id="item_rope"] .classic-preview__dot--filled',
    );
    expect(ropeDots.length).toBe(2);

    const singleScaleDots = hostEl.querySelectorAll(
      '[data-item-id="item_single_scale"] .classic-preview__dot',
    );
    expect(singleScaleDots.length).toBe(1);

    const textRow = hostEl.querySelector('[data-item-id="item_notes"]')!;
    expect(textRow.textContent).toContain('Sempre hidratar após a cena.');
  });
});
