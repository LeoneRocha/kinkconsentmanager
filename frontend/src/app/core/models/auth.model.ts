export interface AuthUser {
  readonly id: number;
  readonly login: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly lastLoginAt?: string | null;
}

export interface LoginRequest {
  readonly loginOrEmail: string;
  readonly password: string;
}

export interface RegisterRequest {
  readonly login: string;
  readonly email: string;
  readonly password: string;
  readonly confirmPassword: string;
}

export interface LoginResponse {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAtUtc: string;
  readonly refreshTokenExpiresAtUtc: string;
  readonly user: AuthUser;
  readonly tokenType?: string;
}

export interface ApiServiceErrorItem {
  readonly field?: string;
  readonly message?: string;
  readonly code?: string;
}

export interface ApiServiceResponse<T> {
  readonly success?: boolean;
  readonly isSuccess?: boolean;
  readonly statusCode?: number;
  readonly message?: string;
  readonly messageKey?: string;
  readonly data?: T;
  readonly errors?: readonly ApiServiceErrorItem[];
}

export type AuthPanelView = 'promo' | 'login' | 'register';

export interface AuthSessionState {
  readonly user: AuthUser | null;
  readonly accessToken: string | null;
  readonly refreshToken: string | null;
  readonly expiresAtUtc: string | null;
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
}
