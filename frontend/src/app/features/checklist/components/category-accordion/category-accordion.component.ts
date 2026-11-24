import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
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

/**
 * Guided category-by-category accordion presentation of checklist items.
 */
@Component({
  selector: 'app-category-accordion',
  imports: [MatExpansionModule, MatButtonModule, DynamicQuestionItemComponent],
  templateUrl: './category-accordion.component.html',
  styleUrl: './category-accordion.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryAccordionComponent {
  readonly groups = input.required<readonly GroupDefinition[]>();
  readonly scales = input.required<readonly ScaleOption[]>();
  readonly answers = input.required<Readonly<Record<string, ItemResponseValue>>>();
  readonly activeIndex = input.required<number>();
  readonly texts = input.required<ResolvedPreviewTexts>();
  readonly nextCategoryLabel = input<string>('Próxima Categoria');
  readonly finishLabel = input<string>('Finalizar e Exportar');
  readonly otherPlaceholder = input<string>('Descreva brevemente sua preferência...');
  readonly noResultsText = input<string>('Nenhum item encontrado para os filtros aplicados.');
  readonly readAloudLabel = input<string>('Ouvir leitura deste item');
  readonly isComplete = input<boolean | undefined>(undefined);

  readonly activeIndexChange = output<number>();
  readonly answerChange = output<{ itemId: string; patch: Partial<ItemResponseValue> }>();
  readonly readItemAloud = output<ItemDefinition>();
  readonly nextCategory = output<void>();
  readonly finishChecklist = output<void>();

  protected readonly isReadyToFinish = computed<boolean>(() => {
    const explicit = this.isComplete();
    if (explicit !== undefined) {
      return explicit;
    }
    const groups = this.groups();
    return (
      groups.length > 0 &&
      groups.every(
        (group) => group.items.length > 0 && this.groupAnsweredCount(group) >= group.items.length,
      )
    );
  });

  protected onAccordionValueChange(value: number): void {
    if (typeof value === 'number') {
      this.activeIndexChange.emit(value);
    }
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
