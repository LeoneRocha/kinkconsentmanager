import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ButtonModule } from 'primeng/button';
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

/**
 * Full-page vertical checklist layout displaying all categories expanded with quick-jump navigation.
 */
@Component({
  selector: 'app-full-view-container',
  imports: [ButtonModule, DynamicQuestionItemComponent],
  templateUrl: './full-view-container.component.html',
  styleUrl: './full-view-container.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FullViewContainerComponent {
  private readonly document = inject(DOCUMENT);

  readonly groups = input.required<readonly GroupDefinition[]>();
  readonly scales = input.required<readonly ScaleOption[]>();
  readonly answers = input.required<Readonly<Record<string, ItemResponseValue>>>();
  readonly texts = input.required<ResolvedPreviewTexts>();
  readonly noResultsText = input.required<string>();
  readonly finishLabel = input.required<string>();
  readonly quickNavTitle = input<string>('Categorias');
  readonly otherPlaceholder = input<string>('Descreva brevemente sua preferência...');

  readonly answerChange = output<{ itemId: string; patch: Partial<ItemResponseValue> }>();
  readonly finishChecklist = output<void>();

  protected jumpToGroup(groupId: string): void {
    const target = this.document.getElementById(this.groupSectionId(groupId));
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  protected groupSectionId(groupId: string): string {
    return `checklist-group-${groupId}`;
  }

  protected onItemAnswerChange(itemId: string, patch: Partial<ItemResponseValue>): void {
    this.answerChange.emit({ itemId, patch });
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
