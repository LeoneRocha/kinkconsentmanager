import { Injectable } from '@angular/core';
import {
  ChecklistSchema,
  ChoiceOptionDefinition,
  FlattenedChecklistRow,
  getScaleAnswerValue,
  ItemDefinition,
  ItemResponseValue,
  OTHER_OPTION_VALUE,
  resolveChoiceOptionLabel,
  ResolvedPreviewTexts,
  resolveOrderedChoiceOptions,
  resolveScaleLabel,
  ScaleId,
  ScaleOption,
} from '../../../core/models';

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * Pure transformation service that normalizes schema groups, items, answers, and resolved texts
 * into a flat sequence of rows for tabular exporters (PDF and CSV).
 */
@Injectable({ providedIn: 'root' })
export class ChecklistFlattenService {
  /**
   * Flattens checklist groups (sorted by `order`) and their items into resolved export rows.
   */
  flatten(
    schema: ChecklistSchema,
    answers: Readonly<Record<string, ItemResponseValue>>,
    texts: ResolvedPreviewTexts,
  ): readonly FlattenedChecklistRow[] {
    const scaleMap = new Map<ScaleId, ScaleOption>();
    const registerScales = (list: readonly ScaleOption[] | undefined): void => {
      if (!list) {
        return;
      }
      for (const scale of list) {
        scaleMap.set(scale.id, scale);
        scaleMap.set(getScaleAnswerValue(scale), scale);
      }
    };

    registerScales(schema.scales);
    if (schema.scaleSets) {
      for (const key of Object.keys(schema.scaleSets)) {
        registerScales(schema.scaleSets[key]);
      }
    }

    const orderedGroups = [...schema.groups].sort((a, b) => a.order - b.order);
    const rows: FlattenedChecklistRow[] = [];

    for (const group of orderedGroups) {
      const groupTitle = texts.groups[group.id]?.title ?? group.id;
      const groupRoles = texts.roles[group.rolePairId] ?? { primary: group.rolePairId };

      for (const item of group.items) {
        registerScales(item.scales);
        const answer = hasOwn(answers, item.id) ? answers[item.id] : undefined;
        const itemLabel = texts.items[item.id]?.label ?? item.id;
        const itemRolePairId = item.rolePairId ?? group.rolePairId;
        const itemRoles = texts.roles[itemRolePairId] ?? groupRoles;
        const isDualRole = item.type === 'scale_matrix' && (item.dualRole ?? group.defaultDualRole);

        if (item.type === 'scale_matrix') {
          rows.push(
            this.buildScaleMatrixRow(
              group.id,
              groupTitle,
              item,
              itemLabel,
              isDualRole,
              itemRoles.primary,
              itemRoles.secondary,
              answer,
              scaleMap,
              texts,
            ),
          );
          continue;
        }

        rows.push(
          this.buildNonScaleRow(
            group.id,
            groupTitle,
            item,
            itemLabel,
            itemRoles.primary,
            answer,
            texts,
          ),
        );
      }
    }

    return rows;
  }

  private buildScaleMatrixRow(
    groupId: string,
    groupTitle: string,
    item: ItemDefinition,
    itemLabel: string,
    isDualRole: boolean,
    primaryRoleLabel: string,
    secondaryRoleLabel: string | undefined,
    answer: ItemResponseValue | undefined,
    scaleMap: ReadonlyMap<ScaleId, ScaleOption>,
    texts: ResolvedPreviewTexts,
  ): FlattenedChecklistRow {
    const primaryScaleId = answer?.primaryScale;
    const primaryScale = primaryScaleId ? scaleMap.get(primaryScaleId) : undefined;
    const primaryValueLabel = primaryScaleId
      ? primaryScale
        ? resolveScaleLabel(primaryScale, texts.scales)
        : (texts.scales[primaryScaleId] ?? primaryScaleId)
      : texts.notAnsweredLabel;

    if (!isDualRole) {
      return {
        groupId,
        groupTitle,
        itemId: item.id,
        itemLabel,
        isDualRole: false,
        primaryRoleLabel,
        primaryValueLabel,
        ...(primaryScale ? { primaryColor: primaryScale.color } : {}),
        selectedOptionsLabels: [],
        customNote: '',
      };
    }

    const secondaryScaleId = answer?.secondaryScale;
    const secondaryScale = secondaryScaleId ? scaleMap.get(secondaryScaleId) : undefined;
    const secondaryValueLabel = secondaryScaleId
      ? secondaryScale
        ? resolveScaleLabel(secondaryScale, texts.scales)
        : (texts.scales[secondaryScaleId] ?? secondaryScaleId)
      : texts.notAnsweredLabel;

    return {
      groupId,
      groupTitle,
      itemId: item.id,
      itemLabel,
      isDualRole: true,
      primaryRoleLabel,
      secondaryRoleLabel,
      primaryValueLabel,
      secondaryValueLabel,
      ...(primaryScale ? { primaryColor: primaryScale.color } : {}),
      ...(secondaryScale ? { secondaryColor: secondaryScale.color } : {}),
      selectedOptionsLabels: [],
      customNote: '',
    };
  }

  private buildNonScaleRow(
    groupId: string,
    groupTitle: string,
    item: ItemDefinition,
    itemLabel: string,
    primaryRoleLabel: string,
    answer: ItemResponseValue | undefined,
    texts: ResolvedPreviewTexts,
  ): FlattenedChecklistRow {
    const optionMap = new Map<string, ChoiceOptionDefinition>();
    for (const opt of resolveOrderedChoiceOptions(item.options)) {
      optionMap.set(opt.id, opt);
      optionMap.set(opt.value, opt);
    }
    const resolveChoiceLabel = (optionKey: string): string => {
      const matched = optionMap.get(optionKey);
      if (matched) {
        return resolveChoiceOptionLabel(matched, texts.options);
      }
      return texts.options[optionKey] ?? optionKey;
    };

    switch (item.type) {
      case 'single_choice': {
        const selected = answer?.selectedOption;
        if (!selected) {
          return {
            groupId,
            groupTitle,
            itemId: item.id,
            itemLabel,
            isDualRole: false,
            primaryRoleLabel,
            primaryValueLabel: texts.notAnsweredLabel,
            selectedOptionsLabels: [],
            customNote: '',
          };
        }

        const isOther = selected === OTHER_OPTION_VALUE;
        const optionLabel = isOther ? texts.otherLabel : resolveChoiceLabel(selected);
        const trimmedOther = isOther ? (answer?.otherText ?? '').trim() : '';
        const primaryValueLabel =
          isOther && trimmedOther.length > 0 ? `${texts.otherLabel}: ${trimmedOther}` : optionLabel;

        return {
          groupId,
          groupTitle,
          itemId: item.id,
          itemLabel,
          isDualRole: false,
          primaryRoleLabel,
          primaryValueLabel,
          selectedOptionsLabels: [optionLabel],
          customNote: trimmedOther,
        };
      }

      case 'multiple_choice': {
        const selected = answer?.selectedOptions ?? [];
        if (selected.length === 0) {
          return {
            groupId,
            groupTitle,
            itemId: item.id,
            itemLabel,
            isDualRole: false,
            primaryRoleLabel,
            primaryValueLabel: texts.notAnsweredLabel,
            selectedOptionsLabels: [],
            customNote: '',
          };
        }

        const hasOther = selected.includes(OTHER_OPTION_VALUE);
        const trimmedOther = hasOther ? (answer?.otherText ?? '').trim() : '';
        const selectedOptionsLabels = selected.map((optionId) =>
          optionId === OTHER_OPTION_VALUE ? texts.otherLabel : resolveChoiceLabel(optionId),
        );
        const formattedLabels = selected.map((optionId) => {
          if (optionId === OTHER_OPTION_VALUE) {
            return trimmedOther.length > 0
              ? `${texts.otherLabel}: ${trimmedOther}`
              : texts.otherLabel;
          }
          return resolveChoiceLabel(optionId);
        });

        return {
          groupId,
          groupTitle,
          itemId: item.id,
          itemLabel,
          isDualRole: false,
          primaryRoleLabel,
          primaryValueLabel: formattedLabels.join(', '),
          selectedOptionsLabels,
          customNote: trimmedOther,
        };
      }

      case 'restricted_text': {
        const rawText = answer?.customText ?? '';
        const isAnswered = rawText.trim().length > 0;
        return {
          groupId,
          groupTitle,
          itemId: item.id,
          itemLabel,
          isDualRole: false,
          primaryRoleLabel,
          primaryValueLabel: isAnswered ? rawText : texts.notAnsweredLabel,
          selectedOptionsLabels: [],
          customNote: isAnswered ? rawText : '',
        };
      }

      case 'scale_matrix':
        return {
          groupId,
          groupTitle,
          itemId: item.id,
          itemLabel,
          isDualRole: false,
          primaryRoleLabel,
          primaryValueLabel: texts.notAnsweredLabel,
          selectedOptionsLabels: [],
          customNote: '',
        };
    }
  }
}
