import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { SupportedLanguage } from '../models';

export type QuestionCatalogSourceKind = 'default' | 'custom_user' | 'custom_template';

export interface QuestionTranslationEntry {
  readonly label: string;
  readonly tooltip: string;
}

export interface GroupTranslationEntry {
  readonly title: string;
  readonly description: string;
}

export interface QuestionTranslationQuery {
  readonly lang: string;
  readonly sourceKind?: QuestionCatalogSourceKind;
  readonly templateId?: string;
}

export interface QuestionTranslationBundle {
  readonly sourceKind: QuestionCatalogSourceKind;
  readonly templateId: string;
  readonly supportedLanguages: readonly SupportedLanguage[];
  readonly groups: Readonly<Record<string, GroupTranslationEntry>>;
  readonly items: Readonly<Record<string, QuestionTranslationEntry>>;
  readonly options: Readonly<Record<string, string>>;
}

/**
 * Contrato desacoplado para carregamento das traduções dos grupos (`groups`), questões (`items`) e opções (`options`).
 * Permite trocar a origem estática por API (padrão, personalizado do usuário ou template customizado)
 * apenas substituindo o provider registrado em `QUESTION_TRANSLATIONS_REPOSITORY_TOKEN`.
 */
export interface IQuestionTranslationsRepository {
  getQuestionTranslations(query: QuestionTranslationQuery): Observable<QuestionTranslationBundle>;
}

export const QUESTION_TRANSLATIONS_REPOSITORY_TOKEN =
  new InjectionToken<IQuestionTranslationsRepository>('IQuestionTranslationsRepository');
