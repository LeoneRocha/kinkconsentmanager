import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, shareReplay, throwError } from 'rxjs';
import { SupportedLanguage } from '../models';
import {
  GroupTranslationEntry,
  IQuestionTranslationsRepository,
  QuestionTranslationBundle,
  QuestionTranslationEntry,
  QuestionTranslationQuery,
} from './question-translations.repository';

const DEFAULT_TEMPLATE_ID = 'default-v1';
const DEFAULT_SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['pt-BR', 'en-US'];

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Implementação padrão que carrega as traduções isoladas dos grupos (`./assets/i18n/groups/{lang}.json`)
 * e das questões (`./assets/i18n/questions/{lang}.json`), com cache em memória e evicção automática
 * em caso de erro para permitir nova tentativa.
 */
@Injectable({ providedIn: 'root' })
export class StaticJsonQuestionTranslationsRepository implements IQuestionTranslationsRepository {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, Observable<QuestionTranslationBundle>>();

  getQuestionTranslations(query: QuestionTranslationQuery): Observable<QuestionTranslationBundle> {
    const lang = query.lang.trim();
    const sourceKind = query.sourceKind ?? 'default';
    const templateId = query.templateId?.trim() || DEFAULT_TEMPLATE_ID;
    const cacheKey = `${sourceKind}:${templateId}:${lang}`;

    const cached$ = this.cache.get(cacheKey);
    if (cached$) {
      return cached$;
    }

    const request$ = forkJoin({
      groupsPayload: this.http.get<unknown>(`./assets/i18n/groups/${lang}.json`),
      questionsPayload: this.http.get<unknown>(`./assets/i18n/questions/${lang}.json`),
    }).pipe(
      map(({ groupsPayload, questionsPayload }) =>
        this.normalizeBundle(groupsPayload, questionsPayload, lang, sourceKind, templateId),
      ),
      catchError((error: unknown) => {
        // Evict failed requests so callers can retry cleanly.
        this.cache.delete(cacheKey);
        return throwError(() => error);
      }),
      shareReplay(1),
    );

    this.cache.set(cacheKey, request$);
    return request$;
  }

  clearCache(): void {
    this.cache.clear();
  }

  private normalizeBundle(
    groupsPayload: unknown,
    questionsPayload: unknown,
    lang: string,
    sourceKind: QuestionTranslationBundle['sourceKind'],
    templateId: string,
  ): QuestionTranslationBundle {
    if (!isPlainRecord(groupsPayload) || !isPlainRecord(groupsPayload['groups'])) {
      throw new Error(
        `Malformed group translations for language "${lang}": expected an object with a "groups" map.`,
      );
    }

    if (!isPlainRecord(questionsPayload) || !isPlainRecord(questionsPayload['items'])) {
      throw new Error(
        `Malformed question translations for language "${lang}": expected an object with an "items" map.`,
      );
    }

    const rawGroups = groupsPayload['groups'];
    const groups: Record<string, GroupTranslationEntry> = {};
    for (const groupId of Object.keys(rawGroups)) {
      const entry = rawGroups[groupId];
      if (!isPlainRecord(entry)) {
        continue;
      }
      groups[groupId] = {
        title: typeof entry['title'] === 'string' ? entry['title'] : '',
        description: typeof entry['description'] === 'string' ? entry['description'] : '',
      };
    }

    const rawItems = questionsPayload['items'];
    const items: Record<string, QuestionTranslationEntry> = {};
    for (const itemId of Object.keys(rawItems)) {
      const entry = rawItems[itemId];
      if (!isPlainRecord(entry)) {
        continue;
      }
      items[itemId] = {
        label: typeof entry['label'] === 'string' ? entry['label'] : '',
        tooltip: typeof entry['tooltip'] === 'string' ? entry['tooltip'] : '',
      };
    }

    return {
      sourceKind,
      templateId,
      supportedLanguages: DEFAULT_SUPPORTED_LANGUAGES,
      groups,
      items,
    };
  }
}
