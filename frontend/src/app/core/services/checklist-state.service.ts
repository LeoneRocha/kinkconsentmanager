import { computed, inject, Injectable, signal } from '@angular/core';
import {
  ChecklistDraft,
  ChecklistSchema,
  ChecklistState,
  ChecklistViewMode,
  GroupDefinition,
  ItemDefinition,
  ItemResponseValue,
  OTHER_OPTION_VALUE,
  ScaleId,
  SupportedLanguage,
} from '../models';
import { BaseStateService } from './base-state.service';
import { LocalStoragePersistenceService } from './local-storage-persistence.service';

const DEFAULT_SCHEMA_VERSION = '1.0.0';
const VALID_SCALE_IDS: ReadonlySet<string> = new Set<ScaleId>([
  'hard_limit',
  'soft_limit',
  'curious',
  'enjoy',
  'favorite',
]);

interface PersistedChecklistState {
  readonly schemaVersion: string;
  readonly viewMode: ChecklistViewMode;
  readonly activeCategoryIndex: number;
}

export interface EncryptedChecklistSnapshot {
  readonly schemaVersion?: string;
  readonly answers: Readonly<Record<string, ItemResponseValue>>;
  readonly viewMode?: ChecklistViewMode;
  readonly activeCategoryIndex?: number;
  readonly savedAt?: string | null;
}

function createInitialChecklistState(): ChecklistState {
  return {
    schemaVersion: DEFAULT_SCHEMA_VERSION,
    answers: {},
    viewMode: 'stepper',
    activeCategoryIndex: 0,
    searchQuery: '',
    onlyUnanswered: false,
    lastUpdatedAt: null,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * Central signal-based state manager for checklist answers, filters, navigation, and persistence.
 */
@Injectable({ providedIn: 'root' })
export class ChecklistStateService extends BaseStateService<ChecklistState> {
  private readonly persistence = inject(LocalStoragePersistenceService);
  private readonly schemaSignal = signal<ChecklistSchema | null>(null);
  private readonly searchableLabelsSignal = signal<Readonly<Record<string, string>>>({});
  private readonly startModeConfirmedSignal = signal<boolean>(false);
  private readonly hasPersistedStateSignal = signal<boolean>(false);

  readonly schema = this.schemaSignal.asReadonly();
  readonly hasConfirmedStartMode = this.startModeConfirmedSignal.asReadonly();
  readonly answers = this.select('answers');
  readonly viewMode = this.select('viewMode');
  readonly activeCategoryIndex = this.select('activeCategoryIndex');
  readonly searchQuery = this.select('searchQuery');
  readonly onlyUnanswered = this.select('onlyUnanswered');
  readonly lastUpdatedAt = this.select('lastUpdatedAt');

  readonly canEnterFillRoute = computed<boolean>(
    () =>
      this.startModeConfirmedSignal() ||
      this.hasPersistedStateSignal() ||
      Object.keys(this.answers()).length > 0,
  );

  readonly totalItemsCount = computed<number>(() => {
    const schema = this.schemaSignal();
    if (!schema) {
      return 0;
    }
    return schema.groups.reduce((total, group) => total + group.items.length, 0);
  });

  readonly answeredItemsCount = computed<number>(() => {
    const schema = this.schemaSignal();
    if (!schema) {
      return 0;
    }
    const answers = this.answers();
    let count = 0;

    for (const group of schema.groups) {
      for (const item of group.items) {
        const answer = hasOwn(answers, item.id) ? answers[item.id] : undefined;
        if (this.isItemAnswered(item, answer)) {
          count += 1;
        }
      }
    }

    return count;
  });

  readonly progressPercentage = computed<number>(() => {
    const total = this.totalItemsCount();
    if (total === 0) {
      return 0;
    }
    return Math.round((this.answeredItemsCount() / total) * 100);
  });

  readonly filteredGroups = computed<readonly GroupDefinition[]>(() => {
    const schema = this.schemaSignal();
    if (!schema) {
      return [];
    }

    const query = this.searchQuery().trim().toLowerCase();
    const onlyUnanswered = this.onlyUnanswered();
    const answers = this.answers();
    const labels = this.searchableLabelsSignal();

    if (!query && !onlyUnanswered) {
      return schema.groups;
    }

    return schema.groups
      .map((group) => {
        const items = group.items.filter((item) => {
          if (onlyUnanswered) {
            const answer = hasOwn(answers, item.id) ? answers[item.id] : undefined;
            if (this.isItemAnswered(item, answer)) {
              return false;
            }
          }

          if (query.length > 0) {
            const matchesId = item.id.toLowerCase().includes(query);
            const label = hasOwn(labels, item.id) ? labels[item.id] : undefined;
            const matchesLabel = label ? label.toLowerCase().includes(query) : false;
            return matchesId || matchesLabel;
          }

          return true;
        });

        return { ...group, items };
      })
      .filter((group) => group.items.length > 0);
  });

  constructor() {
    super(createInitialChecklistState());
    this.hydrateFromPersistence();
  }

  /**
   * Attaches the active schema and clamps the current category index to valid bounds.
   */
  initializeSchema(schema: ChecklistSchema): void {
    this.schemaSignal.set(schema);
    const current = this.stateSignal();
    const clampedIndex = this.clampCategoryIndex(current.activeCategoryIndex, schema);

    if (
      current.schemaVersion !== schema.schemaVersion ||
      current.activeCategoryIndex !== clampedIndex
    ) {
      this.setState({
        schemaVersion: schema.schemaVersion,
        activeCategoryIndex: clampedIndex,
      });
    }
  }

  /**
   * Merges a partial response patch for an item without overwriting unrelated role/note fields.
   */
  setItemAnswer(itemId: string, patch: Partial<ItemResponseValue>): void {
    const currentAnswers = this.stateSignal().answers;
    const existing = hasOwn(currentAnswers, itemId) ? currentAnswers[itemId] : {};
    const merged: ItemResponseValue = { ...existing, ...patch };
    const normalized = this.normalizeResponse(merged);

    const nextAnswers: Record<string, ItemResponseValue> = { ...currentAnswers };
    if (normalized === null) {
      delete nextAnswers[itemId];
    } else {
      nextAnswers[itemId] = normalized;
    }

    this.setState({
      answers: nextAnswers,
      lastUpdatedAt: new Date().toISOString(),
    });
  }

  /**
   * Removes any recorded answer for a single item.
   */
  clearItemAnswer(itemId: string): void {
    const currentAnswers = this.stateSignal().answers;
    if (!hasOwn(currentAnswers, itemId)) {
      return;
    }

    const nextAnswers: Record<string, ItemResponseValue> = { ...currentAnswers };
    delete nextAnswers[itemId];

    this.setState({
      answers: nextAnswers,
      lastUpdatedAt: new Date().toISOString(),
    });
  }

  /**
   * Switches between stepper, classic, and full checklist view modes and persists the preference.
   */
  setViewMode(mode: ChecklistViewMode): void {
    this.setState({ viewMode: mode });
    this.persistCurrentState();
  }

  /**
   * Marca o modo inicial como confirmado para liberar o acesso à rota de preenchimento (`/checklist/fill`).
   */
  confirmStartMode(mode?: ChecklistViewMode): void {
    if (mode) {
      this.setViewMode(mode);
    }
    this.startModeConfirmedSignal.set(true);
  }

  /**
   * Sets the active category index (clamped to loaded schema bounds) and persists it.
   */
  setActiveCategory(index: number): void {
    const clamped = this.clampCategoryIndex(index, this.schemaSignal());
    this.setState({ activeCategoryIndex: clamped });
    this.persistCurrentState();
  }

  /**
   * Advances to the next category group when available; returns false at the final category.
   */
  nextCategory(): boolean {
    const schema = this.schemaSignal();
    if (!schema || schema.groups.length === 0) {
      return false;
    }

    const currentIndex = this.stateSignal().activeCategoryIndex;
    if (currentIndex < schema.groups.length - 1) {
      this.setActiveCategory(currentIndex + 1);
      return true;
    }

    return false;
  }

  /**
   * Updates the transient search filter query.
   */
  setSearchQuery(query: string): void {
    this.setState({ searchQuery: query });
  }

  /**
   * Toggles filtering to show only unanswered items.
   */
  setOnlyUnanswered(enabled: boolean): void {
    this.setState({ onlyUnanswered: enabled });
  }

  /**
   * Registers localized item labels keyed by item ID so search matches translated text.
   */
  setSearchableLabels(labels: Readonly<Record<string, string>>): void {
    this.searchableLabelsSignal.set({ ...labels });
  }

  /**
   * Replaces current answers from an imported draft and updates the modification timestamp.
   */
  importDraft(draft: ChecklistDraft): void {
    const nextAnswers: Record<string, ItemResponseValue> = {};

    for (const [itemId, response] of Object.entries(draft.answers)) {
      const normalized = this.normalizeResponse(response);
      if (normalized !== null) {
        nextAnswers[itemId] = normalized;
      }
    }

    this.setState({
      answers: nextAnswers,
      lastUpdatedAt: new Date().toISOString(),
    });
    this.startModeConfirmedSignal.set(true);
  }

  /**
   * Hydrates answers and navigation preferences recovered from an encrypted autosave snapshot.
   */
  restoreFromEncryptedAutosave(snapshot: EncryptedChecklistSnapshot): void {
    if (snapshot.schemaVersion && snapshot.schemaVersion !== DEFAULT_SCHEMA_VERSION) {
      return;
    }

    const restoredAnswers: Record<string, ItemResponseValue> = {};
    if (isPlainObject(snapshot.answers)) {
      for (const [itemId, rawValue] of Object.entries(snapshot.answers)) {
        const normalized = this.normalizeResponse(rawValue);
        if (normalized !== null) {
          restoredAnswers[itemId] = normalized;
        }
      }
    }

    const nextViewMode: ChecklistViewMode =
      snapshot.viewMode === 'stepper' ||
      snapshot.viewMode === 'classic' ||
      snapshot.viewMode === 'full' ||
      snapshot.viewMode === 'quick_fill'
        ? snapshot.viewMode
        : this.stateSignal().viewMode;

    const nextCategoryIndex =
      typeof snapshot.activeCategoryIndex === 'number' &&
      Number.isInteger(snapshot.activeCategoryIndex) &&
      snapshot.activeCategoryIndex >= 0
        ? this.clampCategoryIndex(snapshot.activeCategoryIndex, this.schemaSignal())
        : this.stateSignal().activeCategoryIndex;

    const nextLastUpdatedAt =
      typeof snapshot.savedAt === 'string' ? snapshot.savedAt : this.stateSignal().lastUpdatedAt;

    this.setState({
      answers: restoredAnswers,
      viewMode: nextViewMode,
      activeCategoryIndex: nextCategoryIndex,
      lastUpdatedAt: nextLastUpdatedAt,
    });
    this.hasPersistedStateSignal.set(true);
    this.persistCurrentState();
  }

  /**
   * Builds an immutable portable draft snapshot from the current answers and language.
   */
  exportDraftSnapshot(language: SupportedLanguage): ChecklistDraft {
    const current = this.stateSignal();
    const clonedAnswers: Record<string, ItemResponseValue> = {};

    for (const [itemId, response] of Object.entries(current.answers)) {
      clonedAnswers[itemId] = {
        ...response,
        ...(response.selectedOptions ? { selectedOptions: [...response.selectedOptions] } : {}),
      };
    }

    return {
      schemaVersion: this.schemaSignal()?.schemaVersion ?? current.schemaVersion,
      exportedAt: new Date().toISOString(),
      language,
      answers: clonedAnswers,
    };
  }

  /**
   * Clears all answers, resets the active category index to 0, and wipes persisted state.
   */
  resetAllAnswers(): void {
    this.setState({
      answers: {},
      activeCategoryIndex: 0,
      lastUpdatedAt: null,
    });
    this.hasPersistedStateSignal.set(false);
    this.persistence.clear();
  }

  /**
   * Evaluates whether an item response contains a meaningful user selection or text value.
   */
  isItemAnswered(item: ItemDefinition, answer: ItemResponseValue | undefined): boolean {
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
        const hasRegularOption = selected.some((option) => option !== OTHER_OPTION_VALUE);
        return hasRegularOption || Boolean(answer.otherText?.trim());
      }

      case 'restricted_text':
        return Boolean(answer.customText?.trim());
    }
  }

  private hydrateFromPersistence(): void {
    const persisted = this.persistence.load<unknown>();
    if (!isPlainObject(persisted)) {
      return;
    }

    if (persisted['schemaVersion'] !== DEFAULT_SCHEMA_VERSION) {
      return;
    }

    const rawViewMode = persisted['viewMode'];
    const viewMode: ChecklistViewMode =
      rawViewMode === 'stepper' ||
      rawViewMode === 'classic' ||
      rawViewMode === 'full' ||
      rawViewMode === 'quick_fill'
        ? rawViewMode
        : 'stepper';

    const rawIndex = persisted['activeCategoryIndex'];
    const activeCategoryIndex =
      typeof rawIndex === 'number' && Number.isInteger(rawIndex) && rawIndex >= 0 ? rawIndex : 0;

    this.setState({
      viewMode,
      activeCategoryIndex,
    });
    this.hasPersistedStateSignal.set(true);

    // Purge legacy plaintext answer payloads from unencrypted storage immediately.
    if (hasOwn(persisted, 'answers') || hasOwn(persisted, 'lastUpdatedAt')) {
      this.persistCurrentState();
    }
  }

  private persistCurrentState(): void {
    const current = this.stateSignal();
    const payload: PersistedChecklistState = {
      schemaVersion: current.schemaVersion,
      viewMode: current.viewMode,
      activeCategoryIndex: current.activeCategoryIndex,
    };
    this.persistence.save(payload);
  }

  private clampCategoryIndex(index: number, schema: ChecklistSchema | null): number {
    const safeIndex = Number.isFinite(index) ? Math.trunc(index) : 0;
    if (!schema) {
      return Math.max(0, safeIndex);
    }
    if (schema.groups.length === 0) {
      return 0;
    }
    return Math.max(0, Math.min(safeIndex, schema.groups.length - 1));
  }

  private normalizeResponse(raw: unknown): ItemResponseValue | null {
    if (!isPlainObject(raw)) {
      return null;
    }

    const cleaned: {
      primaryScale?: ScaleId;
      secondaryScale?: ScaleId;
      selectedOption?: string;
      selectedOptions?: readonly string[];
      otherText?: string;
      customText?: string;
    } = {};

    const primaryScale = raw['primaryScale'];
    if (typeof primaryScale === 'string' && VALID_SCALE_IDS.has(primaryScale)) {
      cleaned.primaryScale = primaryScale as ScaleId;
    }

    const secondaryScale = raw['secondaryScale'];
    if (typeof secondaryScale === 'string' && VALID_SCALE_IDS.has(secondaryScale)) {
      cleaned.secondaryScale = secondaryScale as ScaleId;
    }

    const selectedOption = raw['selectedOption'];
    if (typeof selectedOption === 'string' && selectedOption.length > 0) {
      cleaned.selectedOption = selectedOption;
    }

    const selectedOptions = raw['selectedOptions'];
    if (Array.isArray(selectedOptions)) {
      const validOptions = selectedOptions.filter(
        (opt): opt is string => typeof opt === 'string' && opt.length > 0,
      );
      if (validOptions.length > 0) {
        cleaned.selectedOptions = validOptions;
      }
    }

    const otherText = raw['otherText'];
    if (typeof otherText === 'string' && otherText.length > 0) {
      cleaned.otherText = otherText;
    }

    const customText = raw['customText'];
    if (typeof customText === 'string' && customText.length > 0) {
      cleaned.customText = customText;
    }

    return Object.keys(cleaned).length > 0 ? cleaned : null;
  }
}
