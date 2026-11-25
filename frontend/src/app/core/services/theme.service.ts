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
  readonly isSystemDefault = computed<boolean>(() => this.savedMode() === null);

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

  private getMatchMedia(): ((query: string) => MediaQueryList) | null {
    if (typeof globalThis.matchMedia === 'function') {
      return globalThis.matchMedia.bind(globalThis);
    }
    const docView = this.document?.defaultView;
    if (docView && typeof docView.matchMedia === 'function') {
      return docView.matchMedia.bind(docView);
    }
    return null;
  }

  private readSystemDark(): boolean {
    const matchMediaFn = this.getMatchMedia();
    if (!matchMediaFn) {
      return false;
    }
    try {
      return matchMediaFn('(prefers-color-scheme: dark)')?.matches ?? false;
    } catch {
      return false;
    }
  }

  private watchSystemTheme(): void {
    const matchMediaFn = this.getMatchMedia();
    if (!matchMediaFn) {
      return;
    }

    let media: MediaQueryList | undefined;
    try {
      media = matchMediaFn('(prefers-color-scheme: dark)');
    } catch {
      return;
    }

    if (!media) {
      return;
    }

    const onChange = (event?: MediaQueryListEvent): void => {
      const nextMatches = event ? event.matches : media!.matches;
      this.systemDark.set(nextMatches);
    };

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', onChange);
      this.destroyRef.onDestroy(() => {
        media?.removeEventListener?.('change', onChange);
      });
      return;
    }

    const legacyMedia = media as MediaQueryList & {
      addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
      removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
    };
    if (typeof legacyMedia.addListener === 'function') {
      legacyMedia.addListener(onChange);
      this.destroyRef.onDestroy(() => {
        legacyMedia.removeListener?.(onChange);
      });
    }
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
