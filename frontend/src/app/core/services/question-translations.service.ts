import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { SupportedLanguage } from '../models';
import {
  QUESTION_TRANSLATIONS_REPOSITORY_TOKEN,
  QuestionCatalogSourceKind,
  QuestionTranslationBundle,
  StaticJsonQuestionTranslationsRepository,
} from '../repositories';

const DEFAULT_TEMPLATE_ID = 'default-v1';
const DEFAULT_SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['pt-BR', 'en-US'];

/**
 * Serviço de aplicação responsável por orquestrar o catálogo ativo de traduções de questões
 * (padrão local, personalizado do usuário ou template customizado via API).
 */
@Injectable({ providedIn: 'root' })
export class QuestionTranslationsService {
  private readonly injectedRepository = inject(QUESTION_TRANSLATIONS_REPOSITORY_TOKEN, {
    optional: true,
  });
  private readonly fallbackRepository = inject(StaticJsonQuestionTranslationsRepository);

  private readonly activeSourceKindSignal = signal<QuestionCatalogSourceKind>('default');
  private readonly activeTemplateIdSignal = signal<string>(DEFAULT_TEMPLATE_ID);
  private readonly supportedLanguagesSignal = signal<readonly SupportedLanguage[]>(
    DEFAULT_SUPPORTED_LANGUAGES,
  );

  readonly activeSourceKind = this.activeSourceKindSignal.asReadonly();
  readonly activeTemplateId = this.activeTemplateIdSignal.asReadonly();
  readonly supportedLanguages = this.supportedLanguagesSignal.asReadonly();

  private get repository() {
    return this.injectedRepository ?? this.fallbackRepository;
  }

  setCatalogContext(sourceKind: QuestionCatalogSourceKind, templateId = DEFAULT_TEMPLATE_ID): void {
    this.activeSourceKindSignal.set(sourceKind);
    this.activeTemplateIdSignal.set(templateId.trim() || DEFAULT_TEMPLATE_ID);
  }

  resetToDefaultCatalog(): void {
    this.activeSourceKindSignal.set('default');
    this.activeTemplateIdSignal.set(DEFAULT_TEMPLATE_ID);
    this.supportedLanguagesSignal.set(DEFAULT_SUPPORTED_LANGUAGES);
  }

  isLanguageSupported(lang: SupportedLanguage): boolean {
    return this.supportedLanguagesSignal().includes(lang);
  }

  loadQuestionsForLanguage(lang: string): Observable<QuestionTranslationBundle> {
    return this.repository
      .getQuestionTranslations({
        lang,
        sourceKind: this.activeSourceKindSignal(),
        templateId: this.activeTemplateIdSignal(),
      })
      .pipe(
        tap((bundle) => {
          if (bundle.supportedLanguages.length > 0) {
            this.supportedLanguagesSignal.set(bundle.supportedLanguages);
          }
        }),
      );
  }
}
