import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
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
  imports: [MatButtonModule, MatTooltipModule, DynamicQuestionItemComponent],
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
  readonly readAloudLabel = input<string>('Ouvir leitura deste item');
  readonly expandAllLabel = input<string>('Expandir tudo');
  readonly collapseAllLabel = input<string>('Recolher tudo');
  readonly expandCategoryLabel = input<string>('Expandir categoria');
  readonly collapseCategoryLabel = input<string>('Recolher categoria');

  readonly answerChange = output<{ itemId: string; patch: Partial<ItemResponseValue> }>();
  readonly readItemAloud = output<ItemDefinition>();
  readonly finishChecklist = output<void>();

  protected readonly collapsedGroupIds = signal<ReadonlySet<string>>(new Set());

  protected readonly areAllGroupsExpanded = computed<boolean>(() => {
    const groups = this.groups();
    const collapsed = this.collapsedGroupIds();
    return groups.length > 0 && groups.every((group) => !collapsed.has(group.id));
  });

  protected readonly toggleAllLabel = computed<string>(() =>
    this.areAllGroupsExpanded() ? this.collapseAllLabel() : this.expandAllLabel(),
  );

  protected jumpToGroup(groupId: string): void {
    if (this.isGroupCollapsed(groupId)) {
      this.collapsedGroupIds.update((prev) => {
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });
    }
    const target = this.document.getElementById(this.groupSectionId(groupId));
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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

  protected toggleAllGroups(): void {
    if (this.areAllGroupsExpanded()) {
      this.collapsedGroupIds.set(new Set(this.groups().map((group) => group.id)));
      return;
    }
    this.collapsedGroupIds.set(new Set());
  }

  protected groupToggleTooltip(group: GroupDefinition): string {
    return this.isGroupCollapsed(group.id)
      ? this.expandCategoryLabel()
      : this.collapseCategoryLabel();
  }

  protected groupToggleAriaLabel(group: GroupDefinition): string {
    return `${this.groupToggleTooltip(group)}: ${this.groupTitle(group)}`;
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
