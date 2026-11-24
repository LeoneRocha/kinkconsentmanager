import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GroupDefinition, ItemResponseValue, ResolvedPreviewTexts } from '../../../../core/models';
import { countGroupAnsweredItems, getGroupTitle } from '../../utils/checklist-view.helpers';

/**
 * Reusable quick-jump category pill bar and global expand/collapse toggle for Full View mode.
 * Can render standalone inside `app-full-view-container` or embedded inside `app-checklist-header`.
 */
@Component({
  selector: 'app-full-view-category-nav',
  imports: [MatTooltipModule],
  templateUrl: './full-view-category-nav.component.html',
  styleUrl: './full-view-category-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FullViewCategoryNavComponent {
  readonly groups = input.required<readonly GroupDefinition[]>();
  readonly answers = input.required<Readonly<Record<string, ItemResponseValue>>>();
  readonly texts = input.required<ResolvedPreviewTexts>();
  readonly title = input<string>('Categorias');
  readonly allExpanded = input<boolean>(true);
  readonly expandAllLabel = input<string>('Expandir tudo');
  readonly collapseAllLabel = input<string>('Recolher tudo');
  readonly embedded = input<boolean>(false);

  readonly groupSelect = output<string>();
  readonly toggleAll = output<void>();

  protected readonly toggleAllLabel = computed<string>(() =>
    this.allExpanded() ? this.collapseAllLabel() : this.expandAllLabel(),
  );

  protected groupTitle(group: GroupDefinition): string {
    return getGroupTitle(group, this.texts());
  }

  protected groupAnsweredCount(group: GroupDefinition): number {
    return countGroupAnsweredItems(group, this.answers());
  }
}
