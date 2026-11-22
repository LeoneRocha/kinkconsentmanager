import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { SupportedLanguage } from '../models';

export interface LocaleMetadata {
  readonly code: SupportedLanguage;
  readonly short: string;
  readonly name: string;
  readonly nativeName: string;
  readonly flag: string;
}

const LOCALE_METADATA: Readonly<Record<SupportedLanguage, LocaleMetadata>> = {
  'pt-BR': {
    code: 'pt-BR',
    short: 'PT',
    name: 'Português',
    nativeName: 'Português (Brasil)',
    flag: '🇧🇷',
  },
  'en-US': {
    code: 'en-US',
    short: 'EN',
    name: 'English',
    nativeName: 'English (US)',
    flag: '🇺🇸',
  },
};

/**
 * Catalog of supported interface locales and browser language resolution rules.
 */
@Injectable({ providedIn: 'root' })
export class LocaleCatalogService {
  getFallbackLocales(): readonly LocaleMetadata[] {
    return Object.values(LOCALE_METADATA);
  }

  getFixedLocales(): Observable<readonly LocaleMetadata[]> {
    return of(this.getFallbackLocales());
  }

  getLocaleByCode(code: string): LocaleMetadata | undefined {
    if (!this.isSupportedLocale(code)) {
      return undefined;
    }
    return LOCALE_METADATA[code];
  }

  isSupportedLocale(value: unknown): value is SupportedLanguage {
    return value === 'pt-BR' || value === 'en-US';
  }

  resolveBrowserPreferredLocale(browserLang?: string | null): SupportedLanguage {
    const candidate =
      browserLang ??
      (typeof navigator !== 'undefined' ? navigator.language : undefined) ??
      '';
    const normalized = candidate.trim().toLowerCase();

    if (normalized.startsWith('pt')) {
      return 'pt-BR';
    }
    if (normalized.startsWith('en')) {
      return 'en-US';
    }

    return 'pt-BR';
  }
}
