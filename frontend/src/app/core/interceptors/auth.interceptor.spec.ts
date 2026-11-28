import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideTranslateLoader, provideTranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AuthUser, LoginResponse } from '../models';
import {
  BROWSER_STORAGE_REPOSITORY_TOKEN,
  BrowserStorageRepository,
  QUESTION_TRANSLATIONS_REPOSITORY_TOKEN,
  StaticJsonQuestionTranslationsRepository,
  USER_PREFERENCES_REPOSITORY_TOKEN,
  UserPreferencesRepository,
} from '../repositories';
import {
  API_BASE_URL,
  AUTH_SESSION_STORAGE_KEY,
  AuthService,
  CompositeTranslateLoader,
  I18nService,
} from '../services';
import { authInterceptor } from './auth.interceptor';

const MOCK_USER: AuthUser = {
  id: 1,
  login: 'user.kink',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  lastLoginAt: null,
};

const FUTURE_EXPIRY = new Date(Date.now() + 3600_000).toISOString();

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    localStorage.setItem(
      AUTH_SESSION_STORAGE_KEY,
      JSON.stringify({
        user: MOCK_USER,
        accessToken: 'initial-access-token',
        refreshToken: 'initial-refresh-token',
        expiresAtUtc: FUTURE_EXPIRY,
      }),
    );

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' }),
        { provide: API_BASE_URL, useValue: 'https://api.example.test' },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
    jest.restoreAllMocks();
  });

  // Cenário: Chamadas para a API protegida vs chamadas públicas/assets/domínios externos.
  // Objetivo: Garantir que o Bearer token seja anexado exclusivamente às rotas protegidas da API configurada.
  it('should attach Bearer token only to protected API calls and skip public auth, assets, and external URLs', () => {
    http.get('https://api.example.test/api/v1/checklists/current').subscribe();
    http.post('https://api.example.test/api/v1/auth/login', {}).subscribe();
    http.get('./assets/schemas/checklist-v1.json').subscribe();
    http.get('https://other-origin.example/data').subscribe();

    const apiReq = httpMock.expectOne('https://api.example.test/api/v1/checklists/current');
    expect(apiReq.request.headers.get('Authorization')).toBe('Bearer initial-access-token');
    apiReq.flush({});

    const loginReq = httpMock.expectOne('https://api.example.test/api/v1/auth/login');
    expect(loginReq.request.headers.has('Authorization')).toBe(false);
    loginReq.flush({});

    const assetReq = httpMock.expectOne('./assets/schemas/checklist-v1.json');
    expect(assetReq.request.headers.has('Authorization')).toBe(false);
    assetReq.flush({});

    const externalReq = httpMock.expectOne('https://other-origin.example/data');
    expect(externalReq.request.headers.has('Authorization')).toBe(false);
    externalReq.flush({});
  });

  // Cenário: Duas requisições simultâneas recebem 401 Unauthorized com token expirado.
  // Objetivo: Executar apenas 1 chamada deduplicada a /api/v1/auth/refresh e repetir ambas com o novo Bearer.
  it('should deduplicate refresh on concurrent 401 responses and retry requests with new token', () => {
    let firstResult: unknown;
    let secondResult: unknown;

    http.get('https://api.example.test/api/v1/checklists/current').subscribe((res) => {
      firstResult = res;
    });
    http.get('https://api.example.test/api/v1/auth/me').subscribe((res) => {
      secondResult = res;
    });

    const req1 = httpMock.expectOne('https://api.example.test/api/v1/checklists/current');
    const req2 = httpMock.expectOne('https://api.example.test/api/v1/auth/me');
    req1.flush({}, { status: 401, statusText: 'Unauthorized' });
    req2.flush({}, { status: 401, statusText: 'Unauthorized' });

    const refreshReq = httpMock.expectOne('https://api.example.test/api/v1/auth/refresh');
    expect(refreshReq.request.method).toBe('POST');
    expect(refreshReq.request.body).toEqual({ token: 'initial-refresh-token' });

    const refreshedLogin: LoginResponse = {
      accessToken: 'refreshed-access-token',
      refreshToken: 'refreshed-refresh-token',
      expiresAtUtc: FUTURE_EXPIRY,
      refreshTokenExpiresAtUtc: FUTURE_EXPIRY,
      user: MOCK_USER,
    };
    refreshReq.flush({ isSuccess: true, statusCode: 200, data: refreshedLogin });

    const retry1 = httpMock.expectOne('https://api.example.test/api/v1/checklists/current');
    const retry2 = httpMock.expectOne('https://api.example.test/api/v1/auth/me');
    expect(retry1.request.headers.get('Authorization')).toBe('Bearer refreshed-access-token');
    expect(retry2.request.headers.get('Authorization')).toBe('Bearer refreshed-access-token');

    retry1.flush({ ok: 1 });
    retry2.flush({ ok: 2 });

    expect(firstResult).toEqual({ ok: 1 });
    expect(secondResult).toEqual({ ok: 2 });
    expect(authService.accessToken()).toBe('refreshed-access-token');
  });

  // Cenário: Falha ao renovar o refresh token após 401 Unauthorized.
  // Objetivo: Limpar a sessão autenticada localmente e propagar o erro sem entrar em loop.
  it('should clear session when refresh token fails after 401', () => {
    let receivedStatus: number | undefined;

    http.put('https://api.example.test/api/v1/checklists/current', {}).subscribe({
      error: (err: HttpErrorResponse) => {
        receivedStatus = err.status;
      },
    });

    const req = httpMock.expectOne('https://api.example.test/api/v1/checklists/current');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    const refreshReq = httpMock.expectOne('https://api.example.test/api/v1/auth/refresh');
    refreshReq.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(receivedStatus).toBe(401);
    expect(authService.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
  });
});

describe('authInterceptor bootstrap integration', () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.restoreAllMocks();
  });

  // Cenário: Inicialização real do app com CompositeTranslateLoader + I18nService + authInterceptor + AuthService.
  // Objetivo: Garantir ausência de dependência circular NG0200 para AuthService durante o carregamento de ./assets/i18n/*.json.
  it('should initialize I18nService with CompositeTranslateLoader and resolve AuthService without NG0200 circular dependency', async () => {
    // Arrange
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideTranslateService({
          fallbackLang: 'en-US',
          langs: ['pt-BR', 'en-US'],
          loader: provideTranslateLoader(CompositeTranslateLoader),
        }),
        {
          provide: QUESTION_TRANSLATIONS_REPOSITORY_TOKEN,
          useClass: StaticJsonQuestionTranslationsRepository,
        },
        { provide: BROWSER_STORAGE_REPOSITORY_TOKEN, useClass: BrowserStorageRepository },
        { provide: USER_PREFERENCES_REPOSITORY_TOKEN, useClass: UserPreferencesRepository },
        { provide: API_BASE_URL, useValue: 'https://api.example.test' },
      ],
    });

    const httpMock = TestBed.inject(HttpTestingController);
    const i18n = TestBed.inject(I18nService);

    // Act
    const initPromise = firstValueFrom(i18n.initialize());
    const i18nRequests = httpMock.match((req) => req.url.startsWith('./assets/i18n/'));
    expect(i18nRequests.length).toBeGreaterThan(0);

    for (const pending of i18nRequests) {
      expect(pending.request.headers.has('Authorization')).toBe(false);
      if (pending.request.url.includes('/groups/')) {
        pending.flush({ groups: {} });
      } else if (pending.request.url.includes('/questions/')) {
        pending.flush({ items: {}, options: {} });
      } else {
        pending.flush({ ui: { appTitle: 'Kink Consent Manager' } });
      }
    }

    // Caso o fallback também dispare requisições subsequentes após a primeira rodada, atendê-las também.
    const secondaryRequests = httpMock.match((req) => req.url.startsWith('./assets/i18n/'));
    for (const pending of secondaryRequests) {
      expect(pending.request.headers.has('Authorization')).toBe(false);
      if (pending.request.url.includes('/groups/')) {
        pending.flush({ groups: {} });
      } else if (pending.request.url.includes('/questions/')) {
        pending.flush({ items: {}, options: {} });
      } else {
        pending.flush({ ui: { appTitle: 'Kink Consent Manager' } });
      }
    }

    await initPromise;
    const authService = TestBed.inject(AuthService);

    // Assert
    expect(authService).toBeDefined();
    expect(authService.isAuthenticated()).toBe(false);
    expect(i18n.translateUi('appTitle')).toBe('Kink Consent Manager');
    httpMock.verify();
  });
});
