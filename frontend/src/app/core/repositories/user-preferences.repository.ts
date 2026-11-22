import { inject, Injectable, InjectionToken } from '@angular/core';
import { SupportedLanguage } from '../models';
import { StorageOptions } from '../services/storage.service';
import { BROWSER_STORAGE_REPOSITORY_TOKEN } from './browser-storage.repository';

export const PREF_THEME_KEY = 'kcm_theme_v1';
export const PREF_LANGUAGE_KEY = 'kcm_lang_v1';
export const PREF_ACCESSIBILITY_KEY = 'kcm_a11y_v1';

export type ThemeMode = 'light' | 'dark';
export type FontScale = 'normal' | 'large' | 'xlarge';
export type SpeechRate = 0.85 | 1 | 1.2;

export interface AccessibilityPreferences {
  readonly audioAssistEnabled: boolean;
  readonly visualCaptionsEnabled: boolean;
  readonly speechRate: SpeechRate;
  readonly highContrast: boolean;
  readonly fontScale: FontScale;
  readonly reducedMotion: boolean;
}

export interface UserPreferencesSnapshot {
  readonly theme: ThemeMode | null;
  readonly language: SupportedLanguage | null;
  readonly accessibility: AccessibilityPreferences | null;
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return value === 'pt-BR' || value === 'en-US';
}

function isFontScale(value: unknown): value is FontScale {
  return value === 'normal' || value === 'large' || value === 'xlarge';
}

function isSpeechRate(value: unknown): value is SpeechRate {
  return value === 0.85 || value === 1 || value === 1.2;
}

function sanitizeAccessibility(raw: unknown): AccessibilityPreferences | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  return {
    audioAssistEnabled: record['audioAssistEnabled'] === true,
    visualCaptionsEnabled: record['visualCaptionsEnabled'] === true,
    speechRate: isSpeechRate(record['speechRate']) ? record['speechRate'] : 1,
    highContrast: record['highContrast'] === true,
    fontScale: isFontScale(record['fontScale']) ? record['fontScale'] : 'normal',
    reducedMotion: record['reducedMotion'] === true,
  };
}

/**
 * Repository contract managing browser-persisted user preferences (theme, language, accessibility, and custom keys).
 */
export interface IUserPreferencesRepository {
  getTheme(): ThemeMode | null;
  saveTheme(theme: ThemeMode): boolean;
  clearTheme(): void;
  getLanguage(): SupportedLanguage | null;
  saveLanguage(language: SupportedLanguage): boolean;
  clearLanguage(): void;
  getAccessibility(): AccessibilityPreferences | null;
  saveAccessibility(preferences: AccessibilityPreferences): boolean;
  clearAccessibility(): void;
  getPreference<T>(key: string): T | null;
  savePreference<T>(key: string, value: T, options?: StorageOptions): boolean;
  removePreference(key: string): void;
  getSnapshot(): UserPreferencesSnapshot;
  clearAll(): void;
}

/**
 * Browser localStorage-backed repository validating and persisting user UI & accessibility preferences.
 */
@Injectable({ providedIn: 'root' })
export class UserPreferencesRepository implements IUserPreferencesRepository {
  private readonly storageRepo = inject(BROWSER_STORAGE_REPOSITORY_TOKEN);

  getTheme(): ThemeMode | null {
    const raw = this.storageRepo.get<unknown>(PREF_THEME_KEY, 'local');
    return isThemeMode(raw) ? raw : null;
  }

  saveTheme(theme: ThemeMode): boolean {
    return this.storageRepo.set(PREF_THEME_KEY, theme, undefined, 'local');
  }

  clearTheme(): void {
    this.storageRepo.remove(PREF_THEME_KEY, 'local');
  }

  getLanguage(): SupportedLanguage | null {
    const raw = this.storageRepo.get<unknown>(PREF_LANGUAGE_KEY, 'local');
    return isSupportedLanguage(raw) ? raw : null;
  }

  saveLanguage(language: SupportedLanguage): boolean {
    return this.storageRepo.set(PREF_LANGUAGE_KEY, language, undefined, 'local');
  }

  clearLanguage(): void {
    this.storageRepo.remove(PREF_LANGUAGE_KEY, 'local');
  }

  getAccessibility(): AccessibilityPreferences | null {
    const raw = this.storageRepo.get<unknown>(PREF_ACCESSIBILITY_KEY, 'local');
    return sanitizeAccessibility(raw);
  }

  saveAccessibility(preferences: AccessibilityPreferences): boolean {
    return this.storageRepo.set(PREF_ACCESSIBILITY_KEY, preferences, undefined, 'local');
  }

  clearAccessibility(): void {
    this.storageRepo.remove(PREF_ACCESSIBILITY_KEY, 'local');
  }

  getPreference<T>(key: string): T | null {
    return this.storageRepo.get<T>(key, 'local');
  }

  savePreference<T>(key: string, value: T, options?: StorageOptions): boolean {
    return this.storageRepo.set(key, value, options, 'local');
  }

  removePreference(key: string): void {
    this.storageRepo.remove(key, 'local');
  }

  getSnapshot(): UserPreferencesSnapshot {
    return {
      theme: this.getTheme(),
      language: this.getLanguage(),
      accessibility: this.getAccessibility(),
    };
  }

  clearAll(): void {
    this.clearTheme();
    this.clearLanguage();
    this.clearAccessibility();
  }
}

export const USER_PREFERENCES_REPOSITORY_TOKEN = new InjectionToken<IUserPreferencesRepository>(
  'USER_PREFERENCES_REPOSITORY',
  {
    providedIn: 'root',
    factory: () => inject(UserPreferencesRepository),
  },
);
