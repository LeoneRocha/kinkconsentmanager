import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_BASE_URL, AuthService } from '../services';

export const AUTH_RETRY_ATTEMPTED = new HttpContextToken<boolean>(() => false);

const PUBLIC_AUTH_ENDPOINT_REGEX = /\/api\/v1\/auth\/(login|register|refresh)(?:\?|$)/i;
const LOGOUT_ENDPOINT_REGEX = /\/api\/v1\/auth\/logout(?:\?|$)/i;

function isStaticAssetUrl(url: string): boolean {
  return url.startsWith('./assets/') || url.startsWith('/assets/') || url.startsWith('assets/');
}

function isTargetApiUrl(url: string, apiBaseUrl: string): boolean {
  if (!url || isStaticAssetUrl(url)) {
    return false;
  }

  const normalizedBase = apiBaseUrl.trim().replace(/\/+$/, '');
  if (normalizedBase.length > 0) {
    return (
      url === normalizedBase || url.startsWith(`${normalizedBase}/`) || url.startsWith('/api/')
    );
  }

  return url.startsWith('/api/') || url.startsWith('api/');
}

function isPublicAuthEndpoint(url: string): boolean {
  return PUBLIC_AUTH_ENDPOINT_REGEX.test(url);
}

/**
 * Interceptor HTTP funcional que anexa `Authorization: Bearer` nas chamadas à API configurada
 * e executa renovação transparente deduplicada em `401 Unauthorized` via `AuthService.refreshAccessToken()`.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiBaseUrl = inject(API_BASE_URL);

  if (!isTargetApiUrl(req.url, apiBaseUrl) || isPublicAuthEndpoint(req.url)) {
    return next(req);
  }

  const authService = inject(AuthService);

  const currentToken = authService.accessToken();
  const outgoingReq =
    currentToken && !req.headers.has('Authorization')
      ? req.clone({
          setHeaders: {
            Authorization: `Bearer ${currentToken}`,
          },
        })
      : req;

  return next(outgoingReq).pipe(
    catchError((error: unknown) => {
      const isUnauthorized = error instanceof HttpErrorResponse && error.status === 401;
      const alreadyRetried = outgoingReq.context.get(AUTH_RETRY_ATTEMPTED);
      const isLogout = LOGOUT_ENDPOINT_REGEX.test(outgoingReq.url);

      if (!isUnauthorized || alreadyRetried || isLogout || !authService.getRefreshToken()) {
        return throwError(() => error);
      }

      return authService.refreshAccessToken().pipe(
        switchMap((newAccessToken) => {
          const retriedReq = outgoingReq.clone({
            setHeaders: {
              Authorization: `Bearer ${newAccessToken}`,
            },
            context: outgoingReq.context.set(AUTH_RETRY_ATTEMPTED, true),
          });
          return next(retriedReq);
        }),
      );
    }),
  );
};
