import { ScaleId } from './checklist-schema.model';

export type SupportedLanguage = 'pt-BR' | 'en-US';
export type ChecklistViewMode = 'accordion' | 'full';

export const OTHER_OPTION_VALUE = '__other__' as const;

export interface ItemResponseValue {
  readonly primaryScale?: ScaleId;
  readonly secondaryScale?: ScaleId;
  readonly selectedOption?: string;
  readonly selectedOptions?: readonly string[];
  readonly otherText?: string;
  readonly customText?: string;
}

export interface ChecklistState {
  readonly schemaVersion: string;
  readonly answers: Readonly<Record<string, ItemResponseValue>>;
  readonly viewMode: ChecklistViewMode;
  readonly activeCategoryIndex: number;
  readonly searchQuery: string;
  readonly onlyUnanswered: boolean;
  readonly lastUpdatedAt: string | null;
}

export interface ChecklistDraft {
  readonly schemaVersion: string;
  readonly exportedAt: string;
  readonly language: SupportedLanguage;
  readonly answers: Readonly<Record<string, ItemResponseValue>>;
}

export interface DraftValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly draft?: ChecklistDraft;
}
