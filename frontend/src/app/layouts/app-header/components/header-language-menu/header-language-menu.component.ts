import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SupportedLanguage } from '../../../../core/models';
import {
  AccessibilityService,
  I18nService,
  LocaleMetadata,
  TelemetryService,
} from '../../../../core/services';
import { SchemaTranslatePipe } from '../../../../shared/pipes';

/**
 * Isolated language selector icon button and dropdown menu in the topbar utilities.
 */
@Component({
  selector: 'app-header-language-menu',
  imports: [MatTooltipModule, SchemaTranslatePipe],
  templateUrl: './header-language-menu.component.html',
  styleUrl: './header-language-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderLanguageMenuComponent {
  protected readonly i18n = inject(I18nService);
  private readonly accessibility = inject(AccessibilityService);
  private readonly telemetry = inject(TelemetryService);

  readonly isOpen = input<boolean>(false);
  readonly toggleRequested = output<void>();
  readonly closed = output<void>();

  protected readonly supportedLanguages: readonly LocaleMetadata[] = this.i18n.availableLocales;
  protected readonly currentLangShort = computed<string>(() =>
    this.i18n.currentLang() === 'pt-BR' ? 'PT' : 'EN',
  );

  protected selectLanguage(lang: SupportedLanguage): void {
    this.i18n.setLanguage(lang);
    this.closed.emit();
    this.telemetry.trackEvent('language_changed', { language: lang });
    this.accessibility.announce(this.i18n.translateUi('languageChanged'));
  }
}
