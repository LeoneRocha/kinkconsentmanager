import { computed, DestroyRef, DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';
import {
  PREF_THEME_KEY,
  ThemeMode,
  USER_PREFERENCES_REPOSITORY_TOKEN,
} from '../repositories/user-preferences.repository';

export const THEME_STORAGE_KEY = PREF_THEME_KEY;
export type { ThemeMode };

/**
 * Signal-backed theme manager persisting choices via `UserPreferencesRepository`
 * and synchronizing live OS `prefers-color-scheme` changes when no explicit choice is saved.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly preferencesRepo = inject(USER_PREFERENCES_REPOSITORY_TOKEN);

  private readonly savedMode = signal<ThemeMode | null>(this.preferencesRepo.getTheme());
  private readonly systemDark = signal<boolean>(this.readSystemDark());

  readonly isDark = computed<boolean>(() => {
    const saved = this.savedMode();
    if (saved === 'dark') {
      return true;
    }
    if (saved === 'light') {
      return false;
    }
    return this.systemDark();
  });

  readonly theme = computed<ThemeMode>(() => (this.isDark() ? 'dark' : 'light'));

  constructor() {
    this.applyThemeToDom(this.theme());
    effect(() => {
      this.applyThemeToDom(this.theme());
    });
    this.watchSystemTheme();
  }

  /**
   * Explicitly switches the application theme and persists it in the browser repository.
   */
  setTheme(mode: ThemeMode): void {
    this.preferencesRepo.saveTheme(mode);
    this.savedMode.set(mode);
    this.applyThemeToDom(mode);
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
    this.applyThemeToDom(this.theme());
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

  private applyThemeToDom(mode: ThemeMode): void {
    const root = this.document?.documentElement;
    if (!root) {
      return;
    }

    root.classList.toggle('app-dark', mode === 'dark');
    root.setAttribute('data-theme', mode);
    root.style.colorScheme = mode;
  }
}
