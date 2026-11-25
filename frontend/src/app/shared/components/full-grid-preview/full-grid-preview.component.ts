import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  ChecklistSchema,
  ItemResponseValue,
  OTHER_OPTION_VALUE,
  QuestionType,
  ResolvedPreviewTexts,
  ScaleId,
  ScaleOption,
} from '../../../core/models';
import { LegendBarComponent } from '../legend-bar';

interface PreviewScaleCell {
  readonly answered: boolean;
  readonly label: string;
  readonly color?: string;
  readonly contrastColor?: string;
  readonly icon?: string;
}

interface PreviewRowViewModel {
  readonly itemId: string;
  readonly itemLabel: string;
  readonly type: QuestionType;
  readonly isDualRole: boolean;
  readonly showRoleHint: boolean;
  readonly primaryRoleLabel: string;
  readonly secondaryRoleLabel?: string;
  readonly primaryScaleCell?: PreviewScaleCell;
  readonly secondaryScaleCell?: PreviewScaleCell;
  readonly formattedTextValue?: string;
  readonly isAnswered: boolean;
}

export type ExportPreviewLayout = 'modern' | 'classic';

interface PreviewGroupViewModel {
  readonly groupId: string;
  readonly title: string;
  readonly description?: string;
  readonly hasDualRoleColumns: boolean;
  readonly hasScaleRows: boolean;
  readonly primaryColumnHeader: string;
  readonly secondaryColumnHeader: string;
  readonly rows: readonly PreviewRowViewModel[];
}

@Component({
  selector: 'app-full-grid-preview',
  imports: [LegendBarComponent],
  templateUrl: './full-grid-preview.component.html',
  styleUrl: './full-grid-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FullGridPreviewComponent {
  readonly schema = input.required<ChecklistSchema>();
  readonly answers = input.required<Readonly<Record<string, ItemResponseValue>>>();
  readonly texts = input.required<ResolvedPreviewTexts>();
  readonly layout = input<ExportPreviewLayout>('modern');
  readonly printMode = input<boolean>(false);

  protected readonly orderedScales = computed<readonly ScaleOption[]>(() =>
    [...this.schema().scales].sort((a, b) => a.order - b.order),
  );

  protected readonly previewGroups = computed<readonly PreviewGroupViewModel[]>(() => {
    const schema = this.schema();
    const answers = this.answers();
    const texts = this.texts();
    const scaleMap = new Map<ScaleId, ScaleOption>(
      this.orderedScales().map((scale) => [scale.id, scale]),
    );

    const orderedGroups = [...schema.groups].sort((a, b) => a.order - b.order);

    return orderedGroups.map((group) => {
      const groupTexts = texts.groups[group.id];
      const groupRoles = texts.roles[group.rolePairId] ?? { primary: '' };

      const rows: PreviewRowViewModel[] = group.items.map((item) => {
        const answer = answers[item.id];
        const itemLabel = texts.items[item.id]?.label ?? item.id;
        const isDualRole = item.type === 'scale_matrix' && (item.dualRole ?? group.defaultDualRole);
        const itemRolePairId = item.rolePairId ?? group.rolePairId;
        const itemRoles = texts.roles[itemRolePairId] ?? groupRoles;
        const showRoleHint = isDualRole && itemRolePairId !== group.rolePairId;

        if (item.type === 'scale_matrix') {
          const primaryScaleCell = this.buildScaleCell(answer?.primaryScale, scaleMap, texts);
          const secondaryScaleCell = isDualRole
            ? this.buildScaleCell(answer?.secondaryScale, scaleMap, texts)
            : undefined;
          const isAnswered = primaryScaleCell.answered || (secondaryScaleCell?.answered ?? false);

          return {
            itemId: item.id,
            itemLabel,
            type: item.type,
            isDualRole,
            showRoleHint,
            primaryRoleLabel: itemRoles.primary,
            secondaryRoleLabel: itemRoles.secondary,
            primaryScaleCell,
            secondaryScaleCell,
            isAnswered,
          };
        }

        const { formatted, answered } = this.formatNonScaleAnswer(item.type, answer, texts);
        return {
          itemId: item.id,
          itemLabel,
          type: item.type,
          isDualRole: false,
          showRoleHint: false,
          primaryRoleLabel: itemRoles.primary,
          formattedTextValue: formatted,
          isAnswered: answered,
        };
      });

      const firstDualRow = rows.find((row) => row.isDualRole);
      const hasDualRoleColumns = firstDualRow !== undefined;
      const hasScaleRows = rows.some((row) => row.type === 'scale_matrix');

      return {
        groupId: group.id,
        title: groupTexts?.title ?? group.id,
        description: groupTexts?.description,
        hasDualRoleColumns,
        hasScaleRows,
        primaryColumnHeader: groupRoles.primary || firstDualRow?.primaryRoleLabel || '',
        secondaryColumnHeader: groupRoles.secondary ?? firstDualRow?.secondaryRoleLabel ?? '',
        rows,
      };
    });
  });

  private buildScaleCell(
    scaleId: ScaleId | undefined,
    scaleMap: ReadonlyMap<ScaleId, ScaleOption>,
    texts: ResolvedPreviewTexts,
  ): PreviewScaleCell {
    if (!scaleId) {
      return {
        answered: false,
        label: texts.notAnsweredLabel,
      };
    }

    const scale = scaleMap.get(scaleId);
    const label = texts.scales[scaleId] ?? scaleId;
    if (!scale) {
      return {
        answered: true,
        label,
      };
    }

    return {
      answered: true,
      label,
      color: scale.color,
      contrastColor: scale.contrastColor,
      icon: scale.icon,
    };
  }

  private formatNonScaleAnswer(
    type: Exclude<QuestionType, 'scale_matrix'>,
    answer: ItemResponseValue | undefined,
    texts: ResolvedPreviewTexts,
  ): { readonly formatted: string; readonly answered: boolean } {
    switch (type) {
      case 'single_choice': {
        const selected = answer?.selectedOption;
        if (!selected) {
          return { formatted: texts.notAnsweredLabel, answered: false };
        }
        return {
          formatted: this.formatOptionValue(selected, answer?.otherText, texts),
          answered: true,
        };
      }

      case 'multiple_choice': {
        const selected = answer?.selectedOptions ?? [];
        if (selected.length === 0) {
          return { formatted: texts.notAnsweredLabel, answered: false };
        }
        const labels = selected.map((optionId) =>
          this.formatOptionValue(optionId, answer?.otherText, texts),
        );
        return {
          formatted: labels.join(', '),
          answered: true,
        };
      }

      case 'restricted_text': {
        const rawText = answer?.customText ?? '';
        if (rawText.trim().length === 0) {
          return { formatted: texts.notAnsweredLabel, answered: false };
        }
        return {
          formatted: rawText,
          answered: true,
        };
      }
    }
  }

  private formatOptionValue(
    optionId: string,
    otherText: string | undefined,
    texts: ResolvedPreviewTexts,
  ): string {
    if (optionId === OTHER_OPTION_VALUE) {
      const trimmed = (otherText ?? '').trim();
      return trimmed.length > 0 ? `${texts.otherLabel}: ${trimmed}` : texts.otherLabel;
    }
    return texts.options[optionId] ?? optionId;
  }
}
