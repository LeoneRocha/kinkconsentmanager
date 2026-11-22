import { DOCUMENT, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { take } from 'rxjs';
import {
  ChecklistSchema,
  ResolvedPreviewTexts,
  ResolvedRolePairLabels,
  RolePairId,
  SupportedLanguage,
} from '../models';
import {
  PREF_LANGUAGE_KEY,
  USER_PREFERENCES_REPOSITORY_TOKEN,
} from '../repositories/user-preferences.repository';
import { LocaleCatalogService, LocaleMetadata } from './locale-catalog.service';

export const LANGUAGE_STORAGE_KEY = PREF_LANGUAGE_KEY;

/**
 * Facade over ngx-translate, `LocaleCatalogService`, and `UserPreferencesRepository`
 * managing persistent interface language, document `lang` attribute, and reactive schema lookups.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly document = inject(DOCUMENT);
  private readonly translateService = inject(TranslateService);
  private readonly preferencesRepo = inject(USER_PREFERENCES_REPOSITORY_TOKEN);
  private readonly localeCatalog = inject(LocaleCatalogService);

  private readonly currentLangSignal = signal<SupportedLanguage>('pt-BR');
  private readonly translationRevisionSignal = signal(0);

  readonly availableLocales: readonly LocaleMetadata[] = this.localeCatalog.getFallbackLocales();
  readonly currentLang = this.currentLangSignal.asReadonly();

  constructor() {
    this.translateService.onLangChange
      ?.pipe(takeUntilDestroyed())
      .subscribe((event) => {
        if (this.localeCatalog.isSupportedLocale(event.lang)) {
          this.currentLangSignal.set(event.lang);
          this.syncDocumentLang(event.lang);
        }
        this.translationRevisionSignal.update((rev) => rev + 1);
      });

    this.translateService.onTranslationRefresh
      ?.pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.translationRevisionSignal.update((rev) => rev + 1);
      });

    const persistedLang = this.preferencesRepo.getLanguage();
    const serviceLang = this.translateService.getCurrentLang();
    const initialLang: SupportedLanguage =
      persistedLang ??
      (this.localeCatalog.isSupportedLocale(serviceLang)
        ? serviceLang
        : this.localeCatalog.resolveBrowserPreferredLocale());

    this.currentLangSignal.set(initialLang);
    this.syncDocumentLang(initialLang);
    if (serviceLang !== initialLang) {
      this.translateService.use(initialLang).pipe(take(1)).subscribe({ error: () => { } });
    }
  }

  /**
   * Switches active application language and persists it cleanly without mutating checklist answers.
   */
  setLanguage(lang: SupportedLanguage): void {
    this.currentLangSignal.set(lang);
    this.syncDocumentLang(lang);
    this.preferencesRepo.saveLanguage(lang);
    this.translateService.use(lang).pipe(take(1)).subscribe({ error: () => { } });
    this.translationRevisionSignal.update((rev) => rev + 1);
  }

  private syncDocumentLang(lang: SupportedLanguage): void {
    if (this.document?.documentElement) {
      this.document.documentElement.lang = lang;
    }
  }

  /**
   * Translates a UI key under the `ui.` namespace with optional interpolation parameters.
   */
  translateUi(key: string, params?: Record<string, string | number>): string {
    const fullKey = `ui.${key}`;
    return this.resolveRaw(fullKey, params) ?? fullKey;
  }

  /**
   * Resolves a localized scale label or falls back to the raw scale ID.
   */
  getScaleLabel(scaleId: string): string {
    return this.resolveRaw(`scales.${scaleId}`) ?? scaleId;
  }

  /**
   * Resolves primary and optional secondary role labels for a given role pair identifier.
   */
  getRoleLabels(pairId: RolePairId): ResolvedRolePairLabels {
    const primary = this.resolveRaw(`roles.${pairId}.primary`) ?? pairId;
    if (pairId === 'general') {
      return { primary };
    }

    const secondary = this.resolveRaw(`roles.${pairId}.secondary`);
    return secondary !== null ? { primary, secondary } : { primary };
  }

  /**
   * Resolves a localized group title or falls back to the group ID.
   */
  getGroupTitle(groupId: string): string {
    return this.resolveRaw(`groups.${groupId}.title`) ?? groupId;
  }

  /**
   * Resolves an optional group description, returning an empty string when absent.
   */
  getGroupDescription(groupId: string): string {
    return this.resolveRaw(`groups.${groupId}.description`) ?? '';
  }

  /**
   * Resolves a localized item label or falls back to the item ID.
   */
  getItemLabel(itemId: string): string {
    return this.resolveRaw(`items.${itemId}.label`) ?? itemId;
  }

  /**
   * Resolves an optional item tooltip, returning an empty string when absent.
   */
  getItemTooltip(itemId: string): string {
    return this.resolveRaw(`items.${itemId}.tooltip`) ?? '';
  }

  /**
   * Resolves a localized option label or falls back to the option ID.
   */
  getOptionLabel(optionId: string): string {
    return this.resolveRaw(`options.${optionId}`) ?? optionId;
  }

  /**
   * Pre-resolves all localized text maps required by pure export/preview components.
   */
  buildResolvedPreviewTexts(
    schema: ChecklistSchema,
    generatedAtValue: string,
  ): ResolvedPreviewTexts {
    const scales: Record<string, string> = {};
    for (const scale of schema.scales) {
      scales[scale.id] = this.getScaleLabel(scale.id);
    }

    const rolePairIds = new Set<RolePairId>([
      'giving_receiving',
      'dominant_submissive',
      'self_partner',
      'general',
    ]);
    for (const group of schema.groups) {
      rolePairIds.add(group.rolePairId);
      for (const item of group.items) {
        if (item.rolePairId) {
          rolePairIds.add(item.rolePairId);
        }
      }
    }

    const roles: Record<string, ResolvedRolePairLabels> = {};
    for (const pairId of rolePairIds) {
      roles[pairId] = this.getRoleLabels(pairId);
    }

    const groups: Record<string, { readonly title: string; readonly description?: string }> = {};
    const items: Record<string, { readonly label: string; readonly tooltip?: string }> = {};
    const options: Record<string, string> = {};

    for (const group of schema.groups) {
      const description = this.getGroupDescription(group.id);
      groups[group.id] =
        description.length > 0
          ? { title: this.getGroupTitle(group.id), description }
          : { title: this.getGroupTitle(group.id) };

      for (const item of group.items) {
        const tooltip = this.getItemTooltip(item.id);
        items[item.id] =
          tooltip.length > 0
            ? { label: this.getItemLabel(item.id), tooltip }
            : { label: this.getItemLabel(item.id) };

        if (item.options) {
          for (const optionId of item.options) {
            options[optionId] = this.getOptionLabel(optionId);
          }
        }
      }
    }

    const isPortuguese = this.currentLangSignal() === 'pt-BR';

    return {
      title: this.resolveFirstUiKey(
        ['preview.title', 'appTitle', 'title'],
        'KinkConsentManager',
      ),
      schemaVersionLabel: this.resolveFirstUiKey(
        ['schemaVersionLabel', 'preview.schemaVersion', 'export.schemaVersion', 'schemaVersion'],
        isPortuguese ? 'Versão do Schema' : 'Schema Version',
      ),
      generatedAtLabel: this.resolveFirstUiKey(
        ['generatedAtLabel', 'preview.generatedAt', 'export.generatedAt', 'generatedAt'],
        isPortuguese ? 'Gerado em' : 'Generated at',
      ),
      generatedAtValue,
      notAnsweredLabel: this.resolveFirstUiKey(
        ['notAnswered', 'preview.notAnswered', 'checklist.notAnswered'],
        isPortuguese ? 'Não respondido' : 'Not answered',
      ),
      otherLabel: this.resolveFirstUiKey(
        ['otherOptionLabel', 'preview.other', 'other', 'checklist.other'],
        isPortuguese ? 'Outro' : 'Other',
      ),
      scales,
      roles,
      groups,
      items,
      options,
    };
  }

  private resolveFirstUiKey(keys: readonly string[], fallback: string): string {
    for (const key of keys) {
      const resolved = this.resolveRaw(`ui.${key}`);
      if (resolved !== null) {
        return resolved;
      }
    }
    return fallback;
  }

  private resolveRaw(
    fullKey: string,
    params?: Record<string, string | number>,
  ): string | null {
    this.currentLangSignal();
    this.translationRevisionSignal();

    if (
      typeof this.translateService.hasTranslationKey === 'function' &&
      !this.translateService.hasTranslationKey(fullKey)
    ) {
      return null;
    }

    const translated: unknown = this.translateService.instant(fullKey, params);
    if (typeof translated !== 'string' || translated === fullKey) {
      return null;
    }

    return translated;
  }
}
