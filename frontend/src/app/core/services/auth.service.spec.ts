import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { AuthUser, LoginResponse } from '../models';
import { AUTH_SESSION_STORAGE_KEY, AuthService } from './auth.service';
import { API_BASE_URL } from './base-data.service';

const MOCK_USER: AuthUser = {
  id: 1,
  login: 'user.kink',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  lastLoginAt: null,
};

const FUTURE_EXPIRY = new Date(Date.now() + 60 * 60 * 1000).toISOString();

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  function setupTestBed(): void {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' }),
        { provide: API_BASE_URL, useValue: 'https://api.example.test' },
      ],
    });

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', {
      ui: {
        authErrorLoginFailed: 'Não foi possível entrar.',
        authErrorRegisterFailed: 'Não foi possível cadastrar.',
      },
    });
    translate.use('pt-BR');

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    httpMock?.verify();
    localStorage.clear();
    sessionStorage.clear();
    jest.restoreAllMocks();
  });

  // Cenário: Autenticação bem-sucedida de usuário via login/e-mail e senha.
  // Objetivo: Garantir chamada POST /api/v1/auth/login, atualização de estado reativo e persistência local da sessão.
  it('should authenticate user, update state signals, and persist session on login', () => {
    // Arrange
    setupTestBed();
    const loginData: LoginResponse = {
      accessToken: 'jwt-access-token',
      refreshToken: 'refresh-token-123',
      expiresAtUtc: FUTURE_EXPIRY,
      refreshTokenExpiresAtUtc: FUTURE_EXPIRY,
      user: MOCK_USER,
    };

    let receivedUser: AuthUser | undefined;

    // Act
    service.login({ loginOrEmail: 'user.kink', password: 'Strong@123' }).subscribe((user) => {
      receivedUser = user;
    });

    const req = httpMock.expectOne('https://api.example.test/api/v1/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Accept-Language')).toBe('pt-BR');
    req.flush({ isSuccess: true, statusCode: 200, data: loginData });

    // Assert
    expect(receivedUser).toEqual(MOCK_USER);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.user()).toEqual(MOCK_USER);
    expect(service.isLoading()).toBe(false);
    expect(service.errorMessage()).toBeNull();
    expect(localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toContain('jwt-access-token');
  });

  // Cenário: Falha de autenticação com mensagem detalhada retornada pelo backend.
  // Objetivo: Expor a mensagem da API no signal errorMessage e manter usuário não autenticado.
  it('should capture API validation error message when login fails', () => {
    // Arrange
    setupTestBed();
    let capturedError: Error | undefined;

    // Act
    service.login({ loginOrEmail: 'wrong', password: 'bad' }).subscribe({
      error: (err: Error) => {
        capturedError = err;
      },
    });

    const req = httpMock.expectOne('https://api.example.test/api/v1/auth/login');
    req.flush({ message: 'Credenciais inválidas.' }, { status: 401, statusText: 'Unauthorized' });

    // Assert
    expect(capturedError?.message).toBe('Credenciais inválidas.');
    expect(service.isAuthenticated()).toBe(false);
    expect(service.errorMessage()).toBe('Credenciais inválidas.');
    expect(service.isLoading()).toBe(false);

    service.clearError();
    expect(service.errorMessage()).toBeNull();
  });

  // Cenário: Cadastro de novo usuário com sucesso e com erro de conflito.
  // Objetivo: Garantir envio para /api/v1/auth/register e tratamento de erro da API.
  it('should register a user and handle registration error messages', () => {
    // Arrange
    setupTestBed();
    let createdUser: AuthUser | undefined;
    let registerErr: Error | undefined;

    // Act — Sucesso
    service
      .register({
        login: 'user.kink',
        email: 'user.kink@example.com',
        password: 'Strong@123',
        confirmPassword: 'Strong@123',
      })
      .subscribe((user) => {
        createdUser = user;
      });

    const okReq = httpMock.expectOne('https://api.example.test/api/v1/auth/register');
    expect(okReq.request.method).toBe('POST');
    okReq.flush({ isSuccess: true, statusCode: 201, data: MOCK_USER });
    expect(createdUser).toEqual(MOCK_USER);

    // Act — Erro de validação do backend
    service
      .register({
        login: 'user.kink',
        email: 'user.kink@example.com',
        password: 'Strong@123',
        confirmPassword: 'Strong@123',
      })
      .subscribe({
        error: (err: Error) => {
          registerErr = err;
        },
      });

    const errReq = httpMock.expectOne('https://api.example.test/api/v1/auth/register');
    errReq.flush(
      { errors: [{ field: 'Login', message: 'Login já cadastrado.' }] },
      { status: 409, statusText: 'Conflict' },
    );

    // Assert
    expect(registerErr?.message).toBe('Login já cadastrado.');
    expect(service.errorMessage()).toBe('Login já cadastrado.');
  });

  // Cenário: Restauração de sessão válida persistida e logout com Bearer token.
  // Objetivo: Garantir restauração automática no startup e limpeza completa ao deslogar.
  it('should restore valid session from localStorage and clear on logout', () => {
    // Arrange
    localStorage.setItem(
      AUTH_SESSION_STORAGE_KEY,
      JSON.stringify({
        user: MOCK_USER,
        accessToken: 'saved-jwt-token',
        refreshToken: 'saved-refresh',
        expiresAtUtc: FUTURE_EXPIRY,
      }),
    );

    setupTestBed();
    expect(service.isAuthenticated()).toBe(true);
    expect(service.user()?.login).toBe('user.kink');

    // Act
    let completed = false;
    service.logout().subscribe(() => {
      completed = true;
    });

    const req = httpMock.expectOne('https://api.example.test/api/v1/auth/logout');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer saved-jwt-token');
    req.flush({ isSuccess: true, statusCode: 200, data: true });

    // Assert
    expect(completed).toBe(true);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.user()).toBeNull();
    expect(localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
  });

  // Cenário: Renovação de access token com deduplicação de chamadas concorrentes e limpeza em falha.
  // Objetivo: Garantir que chamadas paralelas a refreshAccessToken() disparem apenas 1 POST /api/v1/auth/refresh.
  it('should deduplicate concurrent refreshAccessToken() calls and clear session on failure', () => {
    localStorage.setItem(
      AUTH_SESSION_STORAGE_KEY,
      JSON.stringify({
        user: MOCK_USER,
        accessToken: 'old-access-token',
        refreshToken: 'old-refresh-token',
        expiresAtUtc: FUTURE_EXPIRY,
      }),
    );

    setupTestBed();

    let tokenA: string | undefined;
    let tokenB: string | undefined;

    service.refreshAccessToken().subscribe((t) => (tokenA = t));
    service.refreshAccessToken().subscribe((t) => (tokenB = t));

    const refreshReq = httpMock.expectOne('https://api.example.test/api/v1/auth/refresh');
    expect(refreshReq.request.method).toBe('POST');
    expect(refreshReq.request.body).toEqual({ token: 'old-refresh-token' });
    refreshReq.flush({
      isSuccess: true,
      statusCode: 200,
      data: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAtUtc: FUTURE_EXPIRY,
        refreshTokenExpiresAtUtc: FUTURE_EXPIRY,
        user: MOCK_USER,
      },
    });

    expect(tokenA).toBe('new-access-token');
    expect(tokenB).toBe('new-access-token');
    expect(service.getRefreshToken()).toBe('new-refresh-token');

    let refreshFailed = false;
    service.refreshAccessToken().subscribe({
      error: () => {
        refreshFailed = true;
      },
    });

    const failReq = httpMock.expectOne('https://api.example.test/api/v1/auth/refresh');
    failReq.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(refreshFailed).toBe(true);
    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
  });
});
