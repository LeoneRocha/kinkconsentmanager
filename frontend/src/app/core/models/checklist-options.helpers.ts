import {
  BUILT_IN_SCALE_IDS,
  ChecklistSchema,
  ChoiceOptionDefinition,
  ChoiceOptionInput,
  ItemDefinition,
  ScaleId,
  ScaleOption,
} from './checklist-schema.model';

/**
 * Resolves the persisted answer value for a scale option, falling back to `scale.id`.
 */
export function getScaleAnswerValue(scale: ScaleOption): ScaleId {
  if (typeof scale.value === 'string') {
    const trimmed = scale.value.trim();
    if (trimmed.length > 0) {
      return trimmed as ScaleId;
    }
  }
  if (typeof scale.value === 'number' && Number.isFinite(scale.value)) {
    return String(scale.value) as ScaleId;
  }
  return scale.id;
}

/**
 * Returns scale options stably sorted by numeric `order`.
 */
export function resolveOrderedScales(scales: readonly ScaleOption[]): readonly ScaleOption[] {
  return [...scales].sort((a, b) => a.order - b.order);
}

/**
 * Resolves the localized display label for a scale option, falling back to inline `scale.label` or `scale.id`.
 */
export function resolveScaleLabel(
  scale: ScaleOption,
  scaleLabels: Readonly<Record<string, string>>,
): string {
  const value = getScaleAnswerValue(scale);
  return scaleLabels[scale.id] ?? scaleLabels[value] ?? scale.label ?? scale.id;
}

/**
 * Resolves effective ordered scale options for an item (`item.scales` -> `scaleSets[item.scaleRef]` -> `defaultScales`).
 */
export function resolveItemScales(
  defaultScales: readonly ScaleOption[],
  item?: ItemDefinition,
  scaleSets?: Readonly<Record<string, readonly ScaleOption[]>>,
): readonly ScaleOption[] {
  if (item?.scales && item.scales.length > 0) {
    return resolveOrderedScales(item.scales);
  }
  if (item?.scaleRef && scaleSets) {
    const referenced = scaleSets[item.scaleRef];
    if (referenced && referenced.length > 0) {
      return resolveOrderedScales(referenced);
    }
  }
  return resolveOrderedScales(defaultScales);
}

/**
 * Collects all accepted scale IDs and values declared in a schema (falling back to built-in scales when unloaded).
 */
export function collectValidScaleValues(schema: ChecklistSchema | null): ReadonlySet<string> {
  if (!schema) {
    return new Set<string>(BUILT_IN_SCALE_IDS);
  }

  const values = new Set<string>();
  const addScales = (scales: readonly ScaleOption[] | undefined): void => {
    if (!scales) {
      return;
    }
    for (const scale of scales) {
      values.add(scale.id);
      values.add(getScaleAnswerValue(scale));
    }
  };

  addScales(schema.scales);
  if (schema.scaleSets) {
    for (const key of Object.keys(schema.scaleSets)) {
      addScales(schema.scaleSets[key]);
    }
  }
  for (const group of schema.groups) {
    for (const item of group.items) {
      addScales(item.scales);
    }
  }

  return values.size > 0 ? values : new Set<string>(BUILT_IN_SCALE_IDS);
}

/**
 * Normalizes a choice option (plain string ID or structured object) into a `ChoiceOptionDefinition`.
 */
export function normalizeChoiceOption(
  option: ChoiceOptionInput,
  fallbackOrder: number,
): ChoiceOptionDefinition {
  if (typeof option === 'string') {
    return {
      id: option,
      value: option,
      order: fallbackOrder,
    };
  }
  return {
    id: option.id,
    value: option.value.trim().length > 0 ? option.value : option.id,
    order: Number.isFinite(option.order) ? option.order : fallbackOrder,
    ...(option.label !== undefined ? { label: option.label } : {}),
  };
}

/**
 * Normalizes and stably sorts choice options by `order`.
 */
export function resolveOrderedChoiceOptions(
  options?: readonly ChoiceOptionInput[],
): readonly ChoiceOptionDefinition[] {
  if (!options || options.length === 0) {
    return [];
  }
  return options
    .map((option, index) => normalizeChoiceOption(option, index + 1))
    .sort((a, b) => a.order - b.order);
}

/**
 * Resolves the display label for a structured choice option from translation maps, inline `label`, or `value`.
 */
export function resolveChoiceOptionLabel(
  option: ChoiceOptionDefinition,
  optionLabels: Readonly<Record<string, string>>,
): string {
  return optionLabels[option.id] ?? optionLabels[option.value] ?? option.label ?? option.value;
}
