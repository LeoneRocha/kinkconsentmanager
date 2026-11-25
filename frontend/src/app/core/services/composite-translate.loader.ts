import { HttpClient } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { forkJoin, map, Observable, of } from 'rxjs';
import { QuestionTranslationsService } from './question-translations.service';

export interface TranslateResourceSource {
  readonly prefix: string;
  readonly suffix: string;
}

export const DEFAULT_TRANSLATE_RESOURCE_SOURCES: readonly TranslateResourceSource[] = [
  { prefix: './assets/i18n/', suffix: '.json' },
];

export const TRANSLATE_RESOURCE_SOURCES = new InjectionToken<readonly TranslateResourceSource[]>(
  'TRANSLATE_RESOURCE_SOURCES',
  {
    providedIn: 'root',
    factory: () => DEFAULT_TRANSLATE_RESOURCE_SOURCES,
  },
);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMergeRecords(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (isPlainRecord(targetValue) && isPlainRecord(sourceValue)) {
      result[key] = deepMergeRecords(targetValue, sourceValue);
    } else if (isPlainRecord(sourceValue)) {
      result[key] = deepMergeRecords({}, sourceValue);
    } else {
      result[key] = sourceValue;
    }
  }

  return result;
}

/**
 * Mescla múltiplos dicionários i18n sem mutar as entradas originais.
 */
export function mergeTranslationObjects(
  dictionaries: readonly (TranslationObject | Record<string, unknown>)[],
): TranslationObject {
  let merged: Record<string, unknown> = {};
  for (const dictionary of dictionaries) {
    if (isPlainRecord(dictionary)) {
      merged = deepMergeRecords(merged, dictionary);
    }
  }
  return merged as TranslationObject;
}

/**
 * Loader composto do @ngx-translate/core que carrega e mescla traduções base da UI
 * (`./assets/i18n/{lang}.json`) com as traduções das questões fornecidas por `QuestionTranslationsService`.
 */
@Injectable({ providedIn: 'root' })
export class CompositeTranslateLoader implements TranslateLoader {
  private readonly http = inject(HttpClient);
  private readonly sources = inject(TRANSLATE_RESOURCE_SOURCES);
  private readonly questionTranslations = inject(QuestionTranslationsService);

  getTranslation(lang: string): Observable<TranslationObject> {
    const baseRequests$: Observable<TranslationObject[]> =
      this.sources.length === 0
        ? of([])
        : forkJoin(
            this.sources.map((source) =>
              this.http.get<TranslationObject>(`${source.prefix}${lang}${source.suffix}`),
            ),
          );

    return forkJoin({
      baseDictionaries: baseRequests$,
      questionBundle: this.questionTranslations.loadQuestionsForLanguage(lang),
    }).pipe(
      map(({ baseDictionaries, questionBundle }) =>
        mergeTranslationObjects([
          ...baseDictionaries,
          {
            groups: questionBundle.groups,
            items: questionBundle.items,
            options: questionBundle.options,
          },
        ]),
      ),
    );
  }
}
