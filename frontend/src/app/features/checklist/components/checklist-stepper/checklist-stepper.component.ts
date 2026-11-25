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
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  GroupDefinition,
  ItemDefinition,
  ItemResponseValue,
  ResolvedPreviewTexts,
  ResolvedRolePairLabels,
  ScaleOption,
} from '../../../../core/models';
import {
  CompletionBannerComponent,
  DynamicQuestionItemComponent,
} from '../../../../shared/components';
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
import { ChecklistStepRailComponent } from './checklist-step-rail.component';

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
  readonly expandCategory?: string;
  readonly collapseCategory?: string;
  readonly finish: string;
  readonly otherPlaceholder: string;
  readonly noResults: string;
  readonly readAloud: string;
  readonly stepIncompleteAlert?: string;
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
  expandCategory: 'Expandir categoria',
  collapseCategory: 'Recolher categoria',
  finish: 'Finalizar e Exportar',
  otherPlaceholder: 'Descreva brevemente sua preferência...',
  noResults: 'Nenhum item encontrado para os filtros aplicados.',
  readAloud: 'Ouvir leitura deste item',
  stepIncompleteAlert: 'Preencha todos os itens deste passo antes de avançar.',
};

/**
 * Multi-step category wizard culminating in an expanded-by-default collapsible accordion review step.
 */
@Component({
  selector: 'app-checklist-stepper',
  imports: [
    MatExpansionModule,
    MatButtonModule,
    MatTooltipModule,
    CompletionBannerComponent,
    DynamicQuestionItemComponent,
    ChecklistStepRailComponent,
  ],
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
  readonly answeredCount = input<number>(0);
  readonly totalCount = input<number>(0);
  readonly progressPercentage = input<number>(0);
  readonly progressLabel = input<string>('Progresso');
  readonly externalChromeHost = input<boolean>(false);
  readonly completionTitle = input<string>('Checklist concluído!');
  readonly completionMessage = input<string>(
    'Todas as questões visíveis foram respondidas. Você já pode revisar suas escolhas ou exportar seu resultado.',
  );
  readonly exportLabel = input<string>('Exportar');

  readonly activeStepChange = output<number>();
  readonly answerChange = output<{ itemId: string; patch: Partial<ItemResponseValue> }>();
  readonly readItemAloud = output<ItemDefinition>();
  readonly finishChecklist = output<void>();

  readonly invalidStepIds = signal<ReadonlySet<string>>(new Set());
  protected readonly collapsedGroupIds = signal<ReadonlySet<string>>(new Set());
  protected readonly expandedReviewValues = signal<number[]>([]);
  protected readonly showIncompleteAlert = signal<boolean>(false);
  private wasOnReviewStep = false;

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

  protected readonly isCurrentStepCompleted = computed<boolean>(() => {
    const group = this.currentGroup();
    return group ? this.isGroupCompleted(group) : true;
  });

  protected readonly canAdvanceCurrentStep = computed<boolean>(() => this.isCurrentStepCompleted());

  protected readonly areAllGroupsCompleted = computed<boolean>(
    () => this.groups().length > 0 && this.groups().every((group) => this.isGroupCompleted(group)),
  );

  protected readonly areAllReviewPanelsExpanded = computed<boolean>(
    () => this.groups().length > 0 && this.expandedReviewValues().length >= this.groups().length,
  );

  protected readonly reviewToggleLabel = computed<string>(() =>
    this.areAllReviewPanelsExpanded() ? this.labels().collapseAll : this.labels().expandAll,
  );

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

    effect(() => {
      const groups = this.groups();
      const answers = this.answers();
      const current = this.currentGroup();

      untracked(() => {
        const currentInvalid = this.invalidStepIds();
        if (currentInvalid.size > 0) {
          let changed = false;
          const next = new Set(currentInvalid);
          for (const group of groups) {
            if (
              next.has(group.id) &&
              countGroupAnsweredItems(group, answers) >= group.items.length
            ) {
              next.delete(group.id);
              changed = true;
            }
          }
          if (changed) {
            this.invalidStepIds.set(next);
          }
        }

        if (current && countGroupAnsweredItems(current, answers) >= current.items.length) {
          this.showIncompleteAlert.set(false);
        }
      });
    });
  }

  protected canAdvanceTo(targetIndex: number): boolean {
    const currentStep = this.safeStep();
    if (targetIndex <= currentStep) {
      return true;
    }

    const groups = this.groups();
    const limit = Math.min(targetIndex, groups.length);
    for (let i = 0; i < limit; i++) {
      if (!this.isGroupCompleted(groups[i])) {
        return false;
      }
    }
    return true;
  }

  selectStep(stepIndex: number): void {
    const groups = this.groups();
    const maxStep = groups.length;
    const clamped = Math.min(Math.max(0, stepIndex), maxStep);
    const currentStep = this.safeStep();

    if (clamped > currentStep && !this.canAdvanceTo(clamped)) {
      const current = this.currentGroup();
      const blockingGroup =
        current && !this.isGroupCompleted(current)
          ? current
          : groups
              .slice(0, Math.min(clamped, groups.length))
              .find((group) => !this.isGroupCompleted(group));

      if (blockingGroup) {
        this.invalidStepIds.update((prev) => {
          const next = new Set(prev);
          next.add(blockingGroup.id);
          return next;
        });
        if (this.collapsedGroupIds().has(blockingGroup.id)) {
          this.collapsedGroupIds.update((prev) => {
            const next = new Set(prev);
            next.delete(blockingGroup.id);
            return next;
          });
        }
      }
      this.showIncompleteAlert.set(true);
      return;
    }

    this.showIncompleteAlert.set(false);
    if (clamped === groups.length) {
      this.expandedReviewValues.set(groups.map((_, index) => index));
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

  goToReviewStep(): void {
    this.selectStep(this.reviewStepIndex());
  }

  protected expandAllReviewPanels(): void {
    this.expandedReviewValues.set(this.groups().map((_, index) => index));
  }

  protected collapseAllReviewPanels(): void {
    this.expandedReviewValues.set([]);
  }

  protected toggleAllReviewPanels(): void {
    if (this.areAllReviewPanelsExpanded()) {
      this.collapseAllReviewPanels();
      return;
    }
    this.expandAllReviewPanels();
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

  protected isGroupCollapsed(groupId: string): boolean {
    return this.collapsedGroupIds().has(groupId);
  }

  protected toggleGroupCollapsed(groupId: string): void {
    this.collapsedGroupIds.update((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  protected onGroupToggleButtonClick(event: MouseEvent, groupId: string): void {
    event.stopPropagation();
    this.toggleGroupCollapsed(groupId);
  }

  protected groupToggleTooltip(group: GroupDefinition): string {
    return this.isGroupCollapsed(group.id)
      ? (this.labels().expandCategory ?? DEFAULT_CHECKLIST_STEPPER_LABELS.expandCategory!)
      : (this.labels().collapseCategory ?? DEFAULT_CHECKLIST_STEPPER_LABELS.collapseCategory!);
  }

  protected groupToggleAriaLabel(group: GroupDefinition): string {
    return `${this.groupToggleTooltip(group)}: ${this.groupTitle(group)}`;
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
