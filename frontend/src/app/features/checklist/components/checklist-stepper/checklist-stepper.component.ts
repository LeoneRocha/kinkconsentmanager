import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import {
  GroupDefinition,
  ItemDefinition,
  ItemResponseValue,
  ResolvedPreviewTexts,
  ResolvedRolePairLabels,
  ScaleOption,
} from '../../../../core/models';
import { DynamicQuestionItemComponent } from '../../../../shared/components';
import {
  countGroupAnsweredItems,
  getGroupDescription,
  getGroupTitle,
  getItemAnswer,
  getItemLabel,
  getItemRoleLabels,
  getItemTooltip,
  isDualRoleScaleItem,
} from '../../utils/checklist-view.helpers';

export interface ChecklistStepperLabels {
  readonly stepLabel: string;
  readonly stepOfLabel: string;
  readonly prevStep: string;
  readonly nextStep: string;
  readonly goToReview: string;
  readonly reviewTitle: string;
  readonly reviewSubtitle: string;
  readonly expandAll: string;
  readonly collapseAll: string;
  readonly finish: string;
  readonly otherPlaceholder: string;
  readonly noResults: string;
  readonly readAloud: string;
}

export const DEFAULT_CHECKLIST_STEPPER_LABELS: ChecklistStepperLabels = {
  stepLabel: 'Passo',
  stepOfLabel: 'de',
  prevStep: 'Passo Anterior',
  nextStep: 'Próximo Passo',
  goToReview: 'Ir para Revisão',
  reviewTitle: 'Revisão Final',
  reviewSubtitle:
    'Todas as categorias estão abertas abaixo para revisão rápida. Você pode recolher ou expandir cada bloco e ajustar qualquer resposta antes de exportar.',
  expandAll: 'Expandir tudo',
  collapseAll: 'Recolher tudo',
  finish: 'Finalizar e Exportar',
  otherPlaceholder: 'Descreva brevemente sua preferência...',
  noResults: 'Nenhum item encontrado para os filtros aplicados.',
  readAloud: 'Ouvir leitura deste item',
};

/**
 * Multi-step category wizard culminating in an expanded-by-default collapsible accordion review step.
 */
@Component({
  selector: 'app-checklist-stepper',
  imports: [MatExpansionModule, MatButtonModule, DynamicQuestionItemComponent],
  templateUrl: './checklist-stepper.component.html',
  styleUrl: './checklist-stepper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistStepperComponent {
  readonly groups = input.required<readonly GroupDefinition[]>();
  readonly scales = input.required<readonly ScaleOption[]>();
  readonly answers = input.required<Readonly<Record<string, ItemResponseValue>>>();
  readonly activeStep = input.required<number>();
  readonly texts = input.required<ResolvedPreviewTexts>();
  readonly labels = input<ChecklistStepperLabels>(DEFAULT_CHECKLIST_STEPPER_LABELS);

  readonly activeStepChange = output<number>();
  readonly answerChange = output<{ itemId: string; patch: Partial<ItemResponseValue> }>();
  readonly readItemAloud = output<ItemDefinition>();
  readonly finishChecklist = output<void>();

  protected readonly expandedReviewValues = signal<number[]>([]);
  private wasOnReviewStep = false;

  protected readonly totalSteps = computed<number>(() => {
    const count = this.groups().length;
    return count > 0 ? count + 1 : 0;
  });

  protected readonly reviewStepIndex = computed<number>(() => this.groups().length);

  protected readonly safeStep = computed<number>(() => {
    const maxStep = this.groups().length;
    return Math.min(Math.max(0, this.activeStep()), maxStep);
  });

  protected readonly isReviewStep = computed<boolean>(
    () => this.groups().length > 0 && this.safeStep() >= this.groups().length,
  );

  protected readonly currentGroup = computed<GroupDefinition | null>(() => {
    if (this.isReviewStep()) {
      return null;
    }
    return this.groups()[this.safeStep()] ?? null;
  });

  protected readonly canGoPrev = computed<boolean>(() => this.safeStep() > 0);

  constructor() {
    effect(() => {
      const groups = this.groups();
      const onReview = this.isReviewStep();

      if (onReview && !this.wasOnReviewStep) {
        untracked(() => {
          this.expandedReviewValues.set(groups.map((_, index) => index));
        });
      } else if (onReview) {
        const current = untracked(() => this.expandedReviewValues());
        if (current.length === 0 && groups.length > 0 && !this.wasOnReviewStep) {
          untracked(() => {
            this.expandedReviewValues.set(groups.map((_, index) => index));
          });
        }
      }

      this.wasOnReviewStep = onReview;
    });
  }

  protected selectStep(stepIndex: number): void {
    const maxStep = this.groups().length;
    const clamped = Math.min(Math.max(0, stepIndex), maxStep);
    if (clamped === this.groups().length) {
      this.expandedReviewValues.set(this.groups().map((_, index) => index));
    }
    this.activeStepChange.emit(clamped);
  }

  protected goPrevStep(): void {
    if (this.canGoPrev()) {
      this.selectStep(this.safeStep() - 1);
    }
  }

  protected goNextStep(): void {
    const next = this.safeStep() + 1;
    if (next <= this.groups().length) {
      this.selectStep(next);
    }
  }

  protected goToReviewStep(): void {
    this.selectStep(this.reviewStepIndex());
  }

  protected expandAllReviewPanels(): void {
    this.expandedReviewValues.set(this.groups().map((_, index) => index));
  }

  protected collapseAllReviewPanels(): void {
    this.expandedReviewValues.set([]);
  }

  protected isReviewPanelExpanded(index: number): boolean {
    return this.expandedReviewValues().includes(index);
  }

  protected onReviewPanelToggled(index: number, expanded: boolean): void {
    this.expandedReviewValues.update((current) => {
      const exists = current.includes(index);
      if (expanded && !exists) {
        return [...current, index];
      }
      if (!expanded && exists) {
        return current.filter((item) => item !== index);
      }
      return current;
    });
  }

  protected onItemAnswerChange(itemId: string, patch: Partial<ItemResponseValue>): void {
    this.answerChange.emit({ itemId, patch });
  }

  protected isGroupCompleted(group: GroupDefinition): boolean {
    return group.items.length > 0 && this.groupAnsweredCount(group) >= group.items.length;
  }

  protected groupTitle(group: GroupDefinition): string {
    return getGroupTitle(group, this.texts());
  }

  protected groupDescription(group: GroupDefinition): string {
    return getGroupDescription(group, this.texts());
  }

  protected groupAnsweredCount(group: GroupDefinition): number {
    return countGroupAnsweredItems(group, this.answers());
  }

  protected isDualRole(group: GroupDefinition, item: ItemDefinition): boolean {
    return isDualRoleScaleItem(group, item);
  }

  protected roleLabels(group: GroupDefinition, item: ItemDefinition): ResolvedRolePairLabels {
    return getItemRoleLabels(group, item, this.texts());
  }

  protected itemLabel(item: ItemDefinition): string {
    return getItemLabel(item, this.texts());
  }

  protected itemTooltip(item: ItemDefinition): string {
    return getItemTooltip(item, this.texts());
  }

  protected itemAnswer(itemId: string): ItemResponseValue | undefined {
    return getItemAnswer(this.answers(), itemId);
  }
}
