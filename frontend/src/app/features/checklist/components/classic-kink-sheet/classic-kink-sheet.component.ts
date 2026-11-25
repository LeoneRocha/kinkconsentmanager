import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  getScaleAnswerValue,
  GroupDefinition,
  ItemDefinition,
  ItemResponseValue,
  ResolvedPreviewTexts,
  ResolvedRolePairLabels,
  resolveItemScales,
  resolveOrderedScales,
  resolveScaleLabel,
  ScaleId,
  ScaleOption,
} from '../../../../core/models';
import { UiFeedbackHostService } from '../../../../core/services';
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

/**
 * Classic KinkSheet-inspired multi-column grouped block checklist view with row dividers and role headers.
 */
@Component({
  selector: 'app-classic-kink-sheet',
  imports: [
    MatButtonModule,
    MatTooltipModule,
    CompletionBannerComponent,
    DynamicQuestionItemComponent,
  ],
  templateUrl: './classic-kink-sheet.component.html',
  styleUrl: './classic-kink-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassicKinkSheetComponent {
  private readonly feedbackHost = inject(UiFeedbackHostService);

  readonly groups = input.required<readonly GroupDefinition[]>();
  readonly scales = input.required<readonly ScaleOption[]>();
  readonly answers = input.required<Readonly<Record<string, ItemResponseValue>>>();
  readonly texts = input.required<ResolvedPreviewTexts>();
  readonly noResultsText = input<string>('Nenhum item encontrado para os filtros aplicados.');
  readonly finishLabel = input<string>('Finalizar e Exportar');
  readonly otherPlaceholder = input<string>('Descreva brevemente sua preferência...');
  readonly readAloudLabel = input<string>('Ouvir leitura deste item');
  readonly expandAllLabel = input<string>('Expandir tudo');
  readonly collapseAllLabel = input<string>('Recolher tudo');
  readonly expandCategoryLabel = input<string>('Expandir categoria');
  readonly collapseCategoryLabel = input<string>('Recolher categoria');
  readonly isComplete = input<boolean | undefined>(undefined);
  readonly completionTitle = input<string>('Checklist concluído!');
  readonly completionMessage = input<string>(
    'Todas as questões visíveis foram respondidas. Você já pode revisar suas escolhas ou exportar seu resultado.',
  );
  readonly reviewLabel = input<string>('Revisar respostas');
  readonly exportLabel = input<string>('Exportar');
  readonly classicHint = input<string>(
    'Visualização clássica em blocos por categoria: clique nos círculos para marcar ou desmarcar cada escala.',
  );

  readonly answerChange = output<{ itemId: string; patch: Partial<ItemResponseValue> }>();
  readonly readItemAloud = output<ItemDefinition>();
  readonly reviewChecklist = output<void>();
  readonly finishChecklist = output<void>();

  protected readonly collapsedGroupIds = signal<ReadonlySet<string>>(new Set());

  protected readonly areAllGroupsExpanded = computed<boolean>(() => {
    const groups = this.groups();
    const collapsed = this.collapsedGroupIds();
    return groups.length > 0 && groups.every((group) => !collapsed.has(group.id));
  });

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

  protected readonly toggleAllLabel = computed<string>(() =>
    this.areAllGroupsExpanded() ? this.collapseAllLabel() : this.expandAllLabel(),
  );

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

  protected onInfoButtonClick(event: MouseEvent, title: string, description: string): void {
    event.stopPropagation();
    this.openInfoPopup(title, description);
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

  protected openInfoPopup(title: string, description: string): void {
    const trimmed = description.trim();
    if (trimmed.length === 0) {
      return;
    }
    this.feedbackHost.modalAlert({
      title,
      message: trimmed,
      icon: 'fa-solid fa-circle-info',
    });
  }

  protected orderedScales(): readonly ScaleOption[] {
    return resolveOrderedScales(this.scales());
  }

  protected itemScales(item: ItemDefinition): readonly ScaleOption[] {
    return resolveItemScales(this.scales(), item);
  }

  protected scaleValue(scale: ScaleOption): ScaleId {
    return getScaleAnswerValue(scale);
  }

  protected hasScaleItems(group: GroupDefinition): boolean {
    return group.items.some((item) => item.type === 'scale_matrix');
  }

  protected groupRoleHeader(group: GroupDefinition): {
    readonly primary: string;
    readonly secondary?: string;
    readonly isDual: boolean;
  } {
    const firstMatrixItem = group.items.find((item) => item.type === 'scale_matrix');
    if (!firstMatrixItem) {
      return { primary: '', isDual: false };
    }
    const labels = getItemRoleLabels(group, firstMatrixItem, this.texts());
    const isDual = group.items.some((item) => isDualRoleScaleItem(group, item));
    return {
      primary: labels.primary,
      secondary: isDual ? labels.secondary : undefined,
      isDual,
    };
  }

  protected selectRoleScale(
    itemId: string,
    roleField: 'primaryScale' | 'secondaryScale',
    scaleId: ScaleId,
  ): void {
    const current = this.itemAnswer(itemId);
    const active = roleField === 'primaryScale' ? current?.primaryScale : current?.secondaryScale;
    const nextValue = active === scaleId ? undefined : scaleId;
    this.answerChange.emit({
      itemId,
      patch:
        roleField === 'primaryScale' ? { primaryScale: nextValue } : { secondaryScale: nextValue },
    });
  }

  protected isRoleScaleSelected(
    itemId: string,
    roleField: 'primaryScale' | 'secondaryScale',
    scaleId: ScaleId,
  ): boolean {
    const current = this.itemAnswer(itemId);
    const active = roleField === 'primaryScale' ? current?.primaryScale : current?.secondaryScale;
    return active === scaleId;
  }

  protected onClassicDotKeydown(
    event: KeyboardEvent,
    item: ItemDefinition,
    roleField: 'primaryScale' | 'secondaryScale',
    currentIndex: number,
  ): void {
    const ordered = this.itemScales(item);
    if (ordered.length === 0) {
      return;
    }

    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % ordered.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + ordered.length) % ordered.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = ordered.length - 1;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    const targetScale = ordered[nextIndex];
    if (targetScale) {
      this.selectRoleScale(item.id, roleField, this.scaleValue(targetScale));
    }
  }

  protected onComplexAnswerChange(itemId: string, patch: Partial<ItemResponseValue>): void {
    this.answerChange.emit({ itemId, patch });
  }

  protected scaleLabel(scale: ScaleOption | ScaleId): string {
    if (typeof scale !== 'string') {
      return resolveScaleLabel(scale, this.texts().scales);
    }
    return this.texts().scales[scale] ?? scale;
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
