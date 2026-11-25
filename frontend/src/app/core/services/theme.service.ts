import { computed, DestroyRef, DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';
import {
  PREF_THEME_KEY,
  ThemeMode,
  USER_PREFERENCES_REPOSITORY_TOKEN,
} from '../repositories/user-preferences.repository';
import {
  getThemePreset,
  THEME_CSS_VAR_MAP,
  THEME_PRESETS,
  ThemeColorTokens,
  ThemeId,
  ThemePresetDefinition,
} from '../themes';

export const THEME_STORAGE_KEY = PREF_THEME_KEY;
export type { ThemeColorTokens, ThemeId, ThemeMode, ThemePresetDefinition };

/**
 * Signal-backed theme manager persisting choices via `UserPreferencesRepository`,
 * synchronizing live OS `prefers-color-scheme` changes when no explicit choice is saved,
 * and exposing token-driven presets structured for future user color customization.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly preferencesRepo = inject(USER_PREFERENCES_REPOSITORY_TOKEN);

  private readonly savedMode = signal<ThemeMode | null>(this.preferencesRepo.getTheme());
  private readonly systemDark = signal<boolean>(this.readSystemDark());
  private readonly tokenOverrides = signal<Partial<ThemeColorTokens>>({});

  readonly presets: readonly ThemePresetDefinition[] = THEME_PRESETS;
  readonly customTokenOverrides = this.tokenOverrides.asReadonly();

  readonly theme = computed<ThemeMode>(() => {
    const saved = this.savedMode();
    if (saved) {
      return saved;
    }
    return this.systemDark() ? 'dark' : 'light';
  });

  readonly activePreset = computed<ThemePresetDefinition>(() => getThemePreset(this.theme()));
  readonly isDark = computed<boolean>(() => this.activePreset().colorScheme === 'dark');
  readonly isSober = computed<boolean>(() => this.theme() === 'sober');

  constructor() {
    this.applyThemeToDom(this.activePreset(), this.tokenOverrides());
    effect(() => {
      this.applyThemeToDom(this.activePreset(), this.tokenOverrides());
    });
    this.watchSystemTheme();
  }

  /**
   * Explicitly switches the application theme and persists it in the browser repository.
   */
  setTheme(mode: ThemeMode): void {
    this.preferencesRepo.saveTheme(mode);
    this.savedMode.set(mode);
    this.applyThemeToDom(getThemePreset(mode), this.tokenOverrides());
  }

  /**
   * Toggles between light and dark themes and returns the newly activated mode.
   */
  toggleTheme(): ThemeMode {
    const nextMode: ThemeMode = this.isDark() ? 'light' : 'dark';
    this.setTheme(nextMode);
    return nextMode;
  }

  /**
   * Clears any saved theme override so the application follows the live OS preference again.
   */
  clearSavedTheme(): void {
    this.preferencesRepo.clearTheme();
    this.savedMode.set(null);
    this.applyThemeToDom(this.activePreset(), this.tokenOverrides());
  }

  /**
   * Applies custom CSS token overrides on top of the active preset (foundation for future user color customization).
   */
  setCustomColorTokens(tokens: Partial<ThemeColorTokens>): void {
    this.tokenOverrides.set({ ...tokens });
    this.applyThemeToDom(this.activePreset(), this.tokenOverrides());
  }

  /**
   * Removes any runtime custom CSS token overrides, restoring pure preset tokens.
   */
  clearCustomColorTokens(): void {
    this.tokenOverrides.set({});
    this.applyThemeToDom(this.activePreset(), {});
  }

  private readSystemDark(): boolean {
    if (typeof globalThis.matchMedia !== 'function') {
      return false;
    }
    try {
      return globalThis.matchMedia('(prefers-color-scheme: dark)')?.matches ?? false;
    } catch {
      return false;
    }
  }

  private watchSystemTheme(): void {
    if (typeof globalThis.matchMedia !== 'function') {
      return;
    }

    let media: MediaQueryList | undefined;
    try {
      media = globalThis.matchMedia('(prefers-color-scheme: dark)');
    } catch {
      return;
    }

    if (!media || typeof media.addEventListener !== 'function') {
      return;
    }

    const onChange = (event?: MediaQueryListEvent): void => {
      const nextMatches = event ? event.matches : media!.matches;
      this.systemDark.set(nextMatches);
    };

    media.addEventListener('change', onChange);
    this.destroyRef.onDestroy(() => {
      media?.removeEventListener?.('change', onChange);
    });
  }

  private applyThemeToDom(
    preset: ThemePresetDefinition,
    overrides: Partial<ThemeColorTokens>,
  ): void {
    const root = this.document?.documentElement;
    if (!root) {
      return;
    }

    root.classList.toggle('app-dark', preset.colorScheme === 'dark');
    root.classList.toggle('app-theme-sober', preset.id === 'sober');
    root.setAttribute('data-theme', preset.id);
    root.style.colorScheme = preset.colorScheme;

    const tokenEntries = Object.entries(THEME_CSS_VAR_MAP) as Array<
      [keyof ThemeColorTokens, string]
    >;
    for (const [tokenKey, cssVar] of tokenEntries) {
      const overrideValue = overrides[tokenKey]?.trim();
      if (overrideValue) {
        root.style.setProperty(cssVar, overrideValue);
      } else {
        root.style.removeProperty(cssVar);
      }
    }
  }
}
