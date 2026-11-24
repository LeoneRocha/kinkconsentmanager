import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import {
  GroupDefinition,
  ItemResponseValue,
  ResolvedPreviewTexts,
  ScaleOption,
} from '../../../../core/models';
import { LegendBarComponent, ProgressIndicatorComponent } from '../../../../shared/components';
import { countGroupAnsweredItems, getGroupTitle } from '../../utils/checklist-view.helpers';
import type { ChecklistStepperLabels } from './checklist-stepper.component';

/**
 * Presentational progress, circular step rail, and scale legend card for stepper navigation.
 */
@Component({
  selector: 'app-checklist-step-rail',
  imports: [LegendBarComponent, ProgressIndicatorComponent],
  templateUrl: './checklist-step-rail.component.html',
  styleUrl: './checklist-step-rail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistStepRailComponent {
  readonly groups = input.required<readonly GroupDefinition[]>();
  readonly scales = input.required<readonly ScaleOption[]>();
  readonly answers = input.required<Readonly<Record<string, ItemResponseValue>>>();
  readonly activeStep = input.required<number>();
  readonly texts = input.required<ResolvedPreviewTexts>();
  readonly labels = input.required<ChecklistStepperLabels>();
  readonly invalidStepIds = input<ReadonlySet<string>>(new Set());
  readonly answeredCount = input<number>(0);
  readonly totalCount = input<number>(0);
  readonly progressPercentage = input<number>(0);
  readonly progressLabel = input<string>('Progresso');
  readonly showProgress = input<boolean>(true);
  readonly showLegend = input<boolean>(true);
  readonly embedded = input<boolean>(false);

  readonly stepSelect = output<number>();
  readonly reviewSelect = output<void>();

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

  protected readonly areAllGroupsCompleted = computed<boolean>(
    () => this.groups().length > 0 && this.groups().every((group) => this.isGroupCompleted(group)),
  );

  protected stepState(
    group: GroupDefinition,
    index: number,
  ): 'done' | 'invalid' | 'active' | 'pending' {
    if (this.isGroupCompleted(group)) {
      return 'done';
    }
    if (this.invalidStepIds().has(group.id)) {
      return 'invalid';
    }
    if (this.safeStep() === index) {
      return 'active';
    }
    return 'pending';
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

  protected isGroupCompleted(group: GroupDefinition): boolean {
    return group.items.length > 0 && this.groupAnsweredCount(group) >= group.items.length;
  }

  protected groupTitle(group: GroupDefinition): string {
    return getGroupTitle(group, this.texts());
  }

  protected groupAnsweredCount(group: GroupDefinition): number {
    return countGroupAnsweredItems(group, this.answers());
  }
}
