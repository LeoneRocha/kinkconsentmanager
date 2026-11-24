import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslationObject } from '@ngx-translate/core';
import { of } from 'rxjs';
import {
  IQuestionTranslationsRepository,
  QUESTION_TRANSLATIONS_REPOSITORY_TOKEN,
} from '../repositories';
import {
  CompositeTranslateLoader,
  TRANSLATE_RESOURCE_SOURCES,
  mergeTranslationObjects,
} from './composite-translate.loader';

describe('CompositeTranslateLoader', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    jest.restoreAllMocks();
  });

  // Cenário: Carregamento paralelo dos dicionários base (UI/estrutura) e do provider padrão de grupos e questões.
  // Objetivo: Garantir que todos os arquivos isolados sejam requisitados e mesclados em um único TranslationObject.
  it('should fetch base i18n and isolated groups/questions via default repository and merge them', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), CompositeTranslateLoader],
    });

    const loader = TestBed.inject(CompositeTranslateLoader);
    const httpMock = TestBed.inject(HttpTestingController);

    let result: TranslationObject | undefined;
    loader.getTranslation('pt-BR').subscribe((translations) => {
      result = translations;
    });

    const baseReq = httpMock.expectOne('./assets/i18n/pt-BR.json');
    const groupsReq = httpMock.expectOne('./assets/i18n/groups/pt-BR.json');
    const questionsReq = httpMock.expectOne('./assets/i18n/questions/pt-BR.json');

    expect(baseReq.request.method).toBe('GET');
    expect(groupsReq.request.method).toBe('GET');
    expect(questionsReq.request.method).toBe('GET');

    baseReq.flush({
      ui: { title: 'Kink Consent Manager' },
      options: { opt_sw_traffic_light: 'Semáforo' },
    });
    groupsReq.flush({
      groups: {
        grp_safety_health: {
          title: 'Segurança',
          description: 'Cuidados essenciais.',
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

    httpMock.verify();
    expect(result).toEqual({
      ui: { title: 'Kink Consent Manager' },
      groups: {
        grp_safety_health: {
          title: 'Segurança',
          description: 'Cuidados essenciais.',
        },
      },
      options: { opt_sw_traffic_light: 'Semáforo' },
      items: {
        item_safeword_system: {
          label: 'Sistema de Safeword',
          tooltip: 'Escolha o mecanismo principal.',
        },
      },
    });
  });

  // Cenário: Substituição do provider de questões por repositório customizado (ex.: API de modelo personalizado).
  // Objetivo: Garantir que basta trocar QUESTION_TRANSLATIONS_REPOSITORY_TOKEN sem acessar arquivos locais de grupos ou questões.
  it('should merge groups and items from a custom injected IQuestionTranslationsRepository provider without requesting static files', () => {
    const customRepo: IQuestionTranslationsRepository = {
      getQuestionTranslations: jest.fn(() =>
        of({
          sourceKind: 'custom_template' as const,
          templateId: 'tpl-api-1',
          supportedLanguages: ['pt-BR'] as const,
          groups: {
            grp_api_1: {
              title: 'Grupo vindo da API',
              description: 'Descrição de grupo customizado.',
            },
          },
          items: {
            item_api_1: {
              label: 'Questão vinda da API',
              tooltip: 'Descrição carregada por provider customizado.',
            },
          },
        }),
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CompositeTranslateLoader,
        { provide: QUESTION_TRANSLATIONS_REPOSITORY_TOKEN, useValue: customRepo },
      ],
    });

    const loader = TestBed.inject(CompositeTranslateLoader);
    const httpMock = TestBed.inject(HttpTestingController);

    let result: TranslationObject | undefined;
    loader.getTranslation('pt-BR').subscribe((translations) => {
      result = translations;
    });

    const baseReq = httpMock.expectOne('./assets/i18n/pt-BR.json');
    httpMock.expectNone('./assets/i18n/groups/pt-BR.json');
    httpMock.expectNone('./assets/i18n/questions/pt-BR.json');
    baseReq.flush({ ui: { title: 'Kink Consent Manager' } });

    httpMock.verify();
    expect(result).toEqual({
      ui: { title: 'Kink Consent Manager' },
      groups: {
        grp_api_1: {
          title: 'Grupo vindo da API',
          description: 'Descrição de grupo customizado.',
        },
      },
      items: {
        item_api_1: {
          label: 'Questão vinda da API',
          tooltip: 'Descrição carregada por provider customizado.',
        },
      },
    });
  });

  // Cenário: Lista vazia de fontes base combinada com provider de grupos/questões e mergeTranslationObjects.
  // Objetivo: Garantir que o loader retorne `groups` e `items` mesmo sem fontes base e mescle dicionários sem mutação.
  it('should still return groups and question items when base sources are empty and merge dictionaries cleanly', () => {
    const customRepo: IQuestionTranslationsRepository = {
      getQuestionTranslations: jest.fn(() =>
        of({
          sourceKind: 'default' as const,
          templateId: 'default-v1',
          supportedLanguages: ['en-US'] as const,
          groups: {
            grp_1: { title: 'G1', description: 'GD1' },
          },
          items: {
            item_1: { label: 'Q1', tooltip: 'D1' },
          },
        }),
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CompositeTranslateLoader,
        { provide: TRANSLATE_RESOURCE_SOURCES, useValue: [] },
        { provide: QUESTION_TRANSLATIONS_REPOSITORY_TOKEN, useValue: customRepo },
      ],
    });

    const loader = TestBed.inject(CompositeTranslateLoader);
    const httpMock = TestBed.inject(HttpTestingController);

    let result: TranslationObject | undefined;
    loader.getTranslation('en-US').subscribe((translations) => {
      result = translations;
    });

    httpMock.verify();
    expect(result).toEqual({
      groups: {
        grp_1: { title: 'G1', description: 'GD1' },
      },
      items: {
        item_1: { label: 'Q1', tooltip: 'D1' },
      },
    });

    const merged = mergeTranslationObjects([
      { ui: { title: 'A', subtitle: 'Sub' } },
      { ui: { title: 'B' }, items: { item_1: { label: 'Q1', tooltip: 'D1' } } },
    ]);
    expect(merged).toEqual({
      ui: { title: 'B', subtitle: 'Sub' },
      items: { item_1: { label: 'Q1', tooltip: 'D1' } },
    });
  });
});
