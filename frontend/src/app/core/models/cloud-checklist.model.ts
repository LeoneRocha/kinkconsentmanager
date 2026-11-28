import { ItemResponseValue, SupportedLanguage } from './checklist-answer.model';

export type AutosavePersistenceMode = 'local' | 'online';

export interface CloudChecklistDto {
  readonly id: number;
  readonly schemaVersion: string;
  readonly language: SupportedLanguage;
  readonly answersJson: string;
  readonly clientUpdatedAtUtc: string;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface UpsertCloudChecklistRequest {
  readonly schemaVersion: string;
  readonly language: SupportedLanguage;
  readonly answersJson: string;
  readonly clientUpdatedAtUtc: string;
  readonly expectedVersion?: number | null;
}

export interface RestoredChecklistPayload {
  readonly schemaVersion: string;
  readonly language: SupportedLanguage;
  readonly answers: Readonly<Record<string, ItemResponseValue>>;
  readonly savedAt: string;
  readonly version: number;
}
