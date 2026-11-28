import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { catchError, finalize, map, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import {
  ApiServiceResponse,
  AuthSessionState,
  AuthUser,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
} from '../models';
import { API_BASE_URL } from './base-data.service';
import { BaseStateService } from './base-state.service';
import { I18nService } from './i18n.service';
import { StorageService } from './storage.service';

export const AUTH_SESSION_STORAGE_KEY = 'kcm_auth_session_v1';

interface PersistedAuthSession {
  readonly user: AuthUser;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAtUtc: string;
}

const INITIAL_AUTH_STATE: AuthSessionState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  expiresAtUtc: null,
  isLoading: false,
  errorMessage: null,
};

/**
 * Serviço de estado e integração HTTP para autenticação de usuários (`login`, `register` e `logout`).
 */
@Injectable({ providedIn: 'root' })
export class AuthService extends BaseStateService<AuthSessionState> {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly storage = inject(StorageService);
  private readonly i18n = inject(I18nService);

  readonly user = this.select('user');
  readonly accessToken = this.select('accessToken');
  readonly isLoading = this.select('isLoading');
  readonly errorMessage = this.select('errorMessage');
  readonly isAuthenticated = computed(
    () => this.stateSignal().user !== null && this.stateSignal().accessToken !== null,
  );

  private refreshInFlight$: Observable<string> | null = null;

  constructor() {
    super(INITIAL_AUTH_STATE);
    this.restoreSession();
  }

  /**
   * Autentica o usuário via login ou e-mail e persiste a sessão localmente.
   */
  login(payload: LoginRequest): Observable<AuthUser> {
    this.setState({ isLoading: true, errorMessage: null });

    return this.http
      .post<ApiServiceResponse<LoginResponse>>(this.buildAuthUrl('login'), payload, {
        headers: this.buildLocaleHeaders(),
      })
      .pipe(
        map((response) => this.unwrapLoginResponse(response)),
        tap((loginData) => {
          this.persistSessionState(loginData);
        }),
        map((loginData) => loginData.user),
        catchError((error: unknown) => {
          const message = this.extractErrorMessage(error, 'authErrorLoginFailed');
          this.setState({ errorMessage: message });
          return throwError(() => new Error(message));
        }),
        finalize(() => {
          this.setState({ isLoading: false });
        }),
      );
  }

  /**
   * Cadastra um novo usuário na API retornando os dados públicos criados.
   */
  register(payload: RegisterRequest): Observable<AuthUser> {
    this.setState({ isLoading: true, errorMessage: null });

    return this.http
      .post<ApiServiceResponse<AuthUser>>(this.buildAuthUrl('register'), payload, {
        headers: this.buildLocaleHeaders(),
      })
      .pipe(
        map((response) => this.unwrapUserResponse(response)),
        catchError((error: unknown) => {
          const message = this.extractErrorMessage(error, 'authErrorRegisterFailed');
          this.setState({ errorMessage: message });
          return throwError(() => new Error(message));
        }),
        finalize(() => {
          this.setState({ isLoading: false });
        }),
      );
  }

  /**
   * Encerra a sessão ativa no servidor (quando há token) e limpa o estado local persistido.
   */
  logout(): Observable<void> {
    const { accessToken, refreshToken } = this.stateSignal();
    this.setState({ isLoading: true, errorMessage: null });

    if (!accessToken) {
      this.clearLocalSession();
      this.setState({ isLoading: false });
      return of(undefined);
    }

    const headers = this.buildLocaleHeaders().set('Authorization', `Bearer ${accessToken}`);
    return this.http
      .post<ApiServiceResponse<boolean>>(this.buildAuthUrl('logout'), { refreshToken }, { headers })
      .pipe(
        map(() => undefined),
        catchError(() => of(undefined)),
        finalize(() => {
          this.clearLocalSession();
        }),
      );
  }

  /**
   * Retorna o refresh token atual em memória quando disponível.
   */
  getRefreshToken(): string | null {
    return this.stateSignal().refreshToken;
  }

  /**
   * Renova o access token utilizando o refresh token atual de forma deduplicada entre requisições concorrentes.
   */
  refreshAccessToken(): Observable<string> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const refreshToken = this.stateSignal().refreshToken;
    if (!refreshToken) {
      this.clearLocalSession();
      return throwError(() => new Error('No refresh token available.'));
    }

    this.refreshInFlight$ = this.http
      .post<ApiServiceResponse<LoginResponse>>(
        this.buildAuthUrl('refresh'),
        { token: refreshToken },
        { headers: this.buildLocaleHeaders() },
      )
      .pipe(
        map((response) => this.unwrapLoginResponse(response)),
        tap((loginData) => {
          this.persistSessionState(loginData);
        }),
        map((loginData) => loginData.accessToken),
        catchError((error: unknown) => {
          this.clearLocalSession();
          return throwError(() => error);
        }),
        finalize(() => {
          this.refreshInFlight$ = null;
        }),
        shareReplay(1),
      );

    return this.refreshInFlight$;
  }

  /**
   * Limpa imediatamente a sessão autenticada local sem chamar o servidor.
   */
  clearSession(): void {
    this.clearLocalSession();
  }

  /**
   * Limpa a mensagem de erro atual antes de trocar de formulário ou tentar novamente.
   */
  clearError(): void {
    this.setState({ errorMessage: null });
  }

  private persistSessionState(loginData: LoginResponse): void {
    const session: PersistedAuthSession = {
      user: loginData.user,
      accessToken: loginData.accessToken,
      refreshToken: loginData.refreshToken,
      expiresAtUtc: loginData.expiresAtUtc,
    };
    this.storage.setLocal(AUTH_SESSION_STORAGE_KEY, session);
    this.setState({
      user: loginData.user,
      accessToken: loginData.accessToken,
      refreshToken: loginData.refreshToken,
      expiresAtUtc: loginData.expiresAtUtc,
      errorMessage: null,
    });
  }

  private restoreSession(): void {
    const saved = this.storage.getLocalJson<PersistedAuthSession>(AUTH_SESSION_STORAGE_KEY);
    if (!this.isValidSavedSession(saved)) {
      this.storage.removeLocal(AUTH_SESSION_STORAGE_KEY);
      return;
    }

    const expiresMs = Date.parse(saved.expiresAtUtc);
    if (Number.isNaN(expiresMs) || expiresMs <= Date.now()) {
      this.storage.removeLocal(AUTH_SESSION_STORAGE_KEY);
      return;
    }

    this.setState({
      user: saved.user,
      accessToken: saved.accessToken,
      refreshToken: saved.refreshToken,
      expiresAtUtc: saved.expiresAtUtc,
    });
  }

  private clearLocalSession(): void {
    this.storage.removeLocal(AUTH_SESSION_STORAGE_KEY);
    this.resetState(INITIAL_AUTH_STATE);
  }

  private buildAuthUrl(action: 'login' | 'register' | 'logout' | 'refresh'): string {
    const base = this.apiBaseUrl.trim().replace(/\/+$/, '');
    const path = `api/v1/auth/${action}`;
    return base ? `${base}/${path}` : `/${path}`;
  }

  private buildLocaleHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Accept-Language': this.i18n.currentLang(),
    });
  }

  private unwrapLoginResponse(response: ApiServiceResponse<LoginResponse>): LoginResponse {
    if (
      response &&
      response.data &&
      typeof response.data.accessToken === 'string' &&
      response.data.user
    ) {
      return response.data;
    }
    throw new Error(this.i18n.translateUi('authErrorLoginFailed'));
  }

  private unwrapUserResponse(response: ApiServiceResponse<AuthUser>): AuthUser {
    if (response && response.data && typeof response.data.login === 'string') {
      return response.data;
    }
    throw new Error(this.i18n.translateUi('authErrorRegisterFailed'));
  }

  private extractErrorMessage(
    error: unknown,
    fallbackKey: 'authErrorLoginFailed' | 'authErrorRegisterFailed',
  ): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error;
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        const record = body as Record<string, unknown>;
        const errors = record['errors'];
        if (Array.isArray(errors) && errors.length > 0) {
          const first = errors[0];
          if (first && typeof first === 'object') {
            const firstRecord = first as Record<string, unknown>;
            const firstMsg =
              firstRecord['description'] ?? firstRecord['message'] ?? firstRecord['defaultMessage'];
            if (typeof firstMsg === 'string' && firstMsg.trim().length > 0) {
              return firstMsg.trim();
            }
          }
        }
        const message = record['message'];
        if (typeof message === 'string' && message.trim().length > 0) {
          return message.trim();
        }
      }
    }

    return this.i18n.translateUi(fallbackKey);
  }

  private isValidSavedSession(value: unknown): value is PersistedAuthSession {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }
    const record = value as Record<string, unknown>;
    const user = record['user'];
    return (
      typeof record['accessToken'] === 'string' &&
      record['accessToken'].length > 0 &&
      typeof record['refreshToken'] === 'string' &&
      typeof record['expiresAtUtc'] === 'string' &&
      user !== null &&
      typeof user === 'object' &&
      !Array.isArray(user) &&
      typeof (user as Record<string, unknown>)['login'] === 'string'
    );
  }
}
