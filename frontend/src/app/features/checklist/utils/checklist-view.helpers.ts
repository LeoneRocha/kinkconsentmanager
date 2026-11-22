import {
  GroupDefinition,
  ItemDefinition,
  ItemResponseValue,
  OTHER_OPTION_VALUE,
  ResolvedPreviewTexts,
  ResolvedRolePairLabels,
} from '../../../core/models';

function hasOwnKey(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * Resolves the localized title for a checklist category group.
 */
export function getGroupTitle(group: GroupDefinition, texts: ResolvedPreviewTexts): string {
  const entry = hasOwnKey(texts.groups, group.id) ? texts.groups[group.id] : undefined;
  return entry?.title ?? group.id;
}

/**
 * Resolves the optional localized description for a checklist category group.
 */
export function getGroupDescription(group: GroupDefinition, texts: ResolvedPreviewTexts): string {
  const entry = hasOwnKey(texts.groups, group.id) ? texts.groups[group.id] : undefined;
  return entry?.description ?? '';
}

/**
 * Resolves the localized display label for a checklist item.
 */
export function getItemLabel(item: ItemDefinition, texts: ResolvedPreviewTexts): string {
  const entry = hasOwnKey(texts.items, item.id) ? texts.items[item.id] : undefined;
  return entry?.label ?? item.id;
}

/**
 * Resolves the optional localized tooltip for a checklist item.
 */
export function getItemTooltip(item: ItemDefinition, texts: ResolvedPreviewTexts): string {
  const entry = hasOwnKey(texts.items, item.id) ? texts.items[item.id] : undefined;
  return entry?.tooltip ?? '';
}

/**
 * Determines whether a scale_matrix item should display dual role selectors.
 */
export function isDualRoleScaleItem(group: GroupDefinition, item: ItemDefinition): boolean {
  return item.type === 'scale_matrix' && (item.dualRole ?? group.defaultDualRole);
}

/**
 * Resolves primary and optional secondary role labels for an item, inheriting from its group.
 */
export function getItemRoleLabels(
  group: GroupDefinition,
  item: ItemDefinition,
  texts: ResolvedPreviewTexts,
): ResolvedRolePairLabels {
  const pairId = item.rolePairId ?? group.rolePairId;
  const labels = hasOwnKey(texts.roles, pairId) ? texts.roles[pairId] : undefined;
  return labels ?? { primary: pairId };
}

/**
 * Safely retrieves a recorded response for an item ID from an answers map.
 */
export function getItemAnswer(
  answers: Readonly<Record<string, ItemResponseValue>>,
  itemId: string,
): ItemResponseValue | undefined {
  return hasOwnKey(answers, itemId) ? answers[itemId] : undefined;
}

/**
 * Checks whether an item has a meaningful user response.
 */
export function isQuestionAnswered(
  item: ItemDefinition,
  answer: ItemResponseValue | undefined,
): boolean {
  if (!answer) {
    return false;
  }

  switch (item.type) {
    case 'scale_matrix':
      return Boolean(answer.primaryScale || answer.secondaryScale);

    case 'single_choice':
      if (!answer.selectedOption || answer.selectedOption.trim().length === 0) {
        return false;
      }
      if (answer.selectedOption === OTHER_OPTION_VALUE) {
        return Boolean(answer.otherText?.trim());
      }
      return true;

    case 'multiple_choice': {
      const selected = answer.selectedOptions ?? [];
      if (selected.length === 0) {
        return false;
      }
      if (!selected.includes(OTHER_OPTION_VALUE)) {
        return true;
      }
      const hasRegularOption = selected.some((opt) => opt !== OTHER_OPTION_VALUE);
      return hasRegularOption || Boolean(answer.otherText?.trim());
    }

    case 'restricted_text':
      return Boolean(answer.customText?.trim());
  }
}

/**
 * Counts how many items within a group currently have meaningful answers.
 */
export function countGroupAnsweredItems(
  group: GroupDefinition,
  answers: Readonly<Record<string, ItemResponseValue>>,
): number {
  let count = 0;
  for (const item of group.items) {
    if (isQuestionAnswered(item, getItemAnswer(answers, item.id))) {
      count += 1;
    }
  }
  return count;
}
