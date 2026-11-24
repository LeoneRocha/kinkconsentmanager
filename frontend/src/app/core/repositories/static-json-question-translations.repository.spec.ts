import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { QuestionTranslationBundle } from './question-translations.repository';
import { StaticJsonQuestionTranslationsRepository } from './static-json-question-translations.repository';

describe('StaticJsonQuestionTranslationsRepository', () => {
  let repository: StaticJsonQuestionTranslationsRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        StaticJsonQuestionTranslationsRepository,
      ],
    });

    repository = TestBed.inject(StaticJsonQuestionTranslationsRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    repository.clearCache();
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  // Cenário: Carregamento de traduções de grupos e questões em arquivos isolados com cache por chave.
  // Objetivo: Garantir normalização para QuestionTranslationBundle e reuso do cache em chamadas repetidas.
  it('should load group and question translations from isolated assets/i18n folders and cache subsequent requests', () => {
    let firstBundle: QuestionTranslationBundle | undefined;
    let secondBundle: QuestionTranslationBundle | undefined;

    repository.getQuestionTranslations({ lang: 'pt-BR' }).subscribe((bundle) => {
      firstBundle = bundle;
    });
    repository.getQuestionTranslations({ lang: 'pt-BR' }).subscribe((bundle) => {
      secondBundle = bundle;
    });

    const groupsReq = httpMock.expectOne('./assets/i18n/groups/pt-BR.json');
    const questionsReq = httpMock.expectOne('./assets/i18n/questions/pt-BR.json');
    expect(groupsReq.request.method).toBe('GET');
    expect(questionsReq.request.method).toBe('GET');

    groupsReq.flush({
      groups: {
        grp_safety_health: {
          title: 'Segurança, Saúde e Aftercare',
          description: 'Combinados essenciais.',
        },
      },
    });
    questionsReq.flush({
      items: {
        item_safeword_system: {
          label: 'Sistema de Safeword',
          tooltip: 'Escolha o mecanismo principal.',
        },
      },
    });

    expect(firstBundle).toEqual({
      sourceKind: 'default',
      templateId: 'default-v1',
      supportedLanguages: ['pt-BR', 'en-US'],
      groups: {
        grp_safety_health: {
          title: 'Segurança, Saúde e Aftercare',
          description: 'Combinados essenciais.',
        },
      },
      items: {
        item_safeword_system: {
          label: 'Sistema de Safeword',
          tooltip: 'Escolha o mecanismo principal.',
        },
      },
    });
    expect(secondBundle).toEqual(firstBundle);
  });

  // Cenário: Payload inválido (sem mapa `items` ou `groups`) e limpeza de cache após falha.
  // Objetivo: Rejeitar payloads malformados e remover o stream falho do cache para permitir nova tentativa.
  it('should reject malformed payloads without groups or items and evict failed requests from cache on retry', () => {
    let caughtError: Error | undefined;
    repository.getQuestionTranslations({ lang: 'en-US' }).subscribe({
      error: (err: Error) => {
        caughtError = err;
      },
    });

    const failedGroupsReq = httpMock.expectOne('./assets/i18n/groups/en-US.json');
    const failedQuestionsReq = httpMock.expectOne('./assets/i18n/questions/en-US.json');
    failedGroupsReq.flush({
      groups: { grp_safety_health: { title: 'Safety', description: 'Core' } },
    });
    failedQuestionsReq.flush({ unexpected: true });

    expect(caughtError?.message).toContain('Malformed question translations');

    let retriedBundle: QuestionTranslationBundle | undefined;
    repository.getQuestionTranslations({ lang: 'en-US' }).subscribe((bundle) => {
      retriedBundle = bundle;
    });

    const retryGroupsReq = httpMock.expectOne('./assets/i18n/groups/en-US.json');
    const retryQuestionsReq = httpMock.expectOne('./assets/i18n/questions/en-US.json');
    retryGroupsReq.flush({
      groups: {
        grp_safety_health: {
          title: 'Safety, Health & Aftercare',
          description: 'Essential agreements.',
        },
      },
    });
    retryQuestionsReq.flush({
      items: {
        item_safeword_system: {
          label: 'Safeword System',
          tooltip: 'Select the primary mechanism.',
        },
      },
    });

    expect(retriedBundle?.groups['grp_safety_health']?.title).toBe('Safety, Health & Aftercare');
    expect(retriedBundle?.items['item_safeword_system']?.label).toBe('Safeword System');

    repository.clearCache();
    repository.getQuestionTranslations({ lang: 'en-US' }).subscribe();
    httpMock.expectOne('./assets/i18n/groups/en-US.json').flush({ groups: {} });
    httpMock.expectOne('./assets/i18n/questions/en-US.json').flush({ items: {} });
  });
});
