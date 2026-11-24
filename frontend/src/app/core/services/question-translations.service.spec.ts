import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  IQuestionTranslationsRepository,
  QUESTION_TRANSLATIONS_REPOSITORY_TOKEN,
  QuestionTranslationBundle,
  QuestionTranslationQuery,
} from '../repositories';
import { QuestionTranslationsService } from './question-translations.service';

describe('QuestionTranslationsService', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    jest.restoreAllMocks();
  });

  // Cenário: Troca do provider via QUESTION_TRANSLATIONS_REPOSITORY_TOKEN por uma fonte personalizada (ex.: API).
  // Objetivo: Garantir delegação desacoplada com sourceKind/templateId e atualização de supportedLanguages.
  it('should delegate to the injected IQuestionTranslationsRepository provider and track catalog context', () => {
    const customBundle: QuestionTranslationBundle = {
      sourceKind: 'custom_user',
      templateId: 'user-tpl-42',
      supportedLanguages: ['pt-BR'],
      groups: {
        grp_custom_1: {
          title: 'Categoria customizada',
          description: 'Descrição de grupo cadastrada pelo usuário.',
        },
      },
      items: {
        item_custom_1: {
          label: 'Pergunta customizada',
          tooltip: 'Descrição cadastrada pelo usuário.',
        },
      },
      options: {
        opt_custom_1: 'Opção customizada',
      },
    };

    const getQuestionTranslationsMock = jest
      .fn<
        ReturnType<IQuestionTranslationsRepository['getQuestionTranslations']>,
        [QuestionTranslationQuery]
      >()
      .mockReturnValue(of(customBundle));

    const mockRepo: IQuestionTranslationsRepository = {
      getQuestionTranslations: getQuestionTranslationsMock,
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: QUESTION_TRANSLATIONS_REPOSITORY_TOKEN, useValue: mockRepo },
      ],
    });

    const service = TestBed.inject(QuestionTranslationsService);
    expect(service.activeSourceKind()).toBe('default');
    expect(service.activeTemplateId()).toBe('default-v1');
    expect(service.isLanguageSupported('en-US')).toBe(true);

    service.setCatalogContext('custom_user', 'user-tpl-42');
    expect(service.activeSourceKind()).toBe('custom_user');
    expect(service.activeTemplateId()).toBe('user-tpl-42');

    let loaded: QuestionTranslationBundle | undefined;
    service.loadQuestionsForLanguage('pt-BR').subscribe((bundle) => {
      loaded = bundle;
    });

    expect(getQuestionTranslationsMock).toHaveBeenCalledWith({
      lang: 'pt-BR',
      sourceKind: 'custom_user',
      templateId: 'user-tpl-42',
    });
    expect(loaded).toEqual(customBundle);
    expect(service.supportedLanguages()).toEqual(['pt-BR']);
    expect(service.isLanguageSupported('pt-BR')).toBe(true);
    expect(service.isLanguageSupported('en-US')).toBe(false);

    service.resetToDefaultCatalog();
    expect(service.activeSourceKind()).toBe('default');
    expect(service.activeTemplateId()).toBe('default-v1');
    expect(service.supportedLanguages()).toEqual(['pt-BR', 'en-US']);
  });
});
