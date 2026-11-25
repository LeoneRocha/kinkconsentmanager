import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { SupportedLanguage } from '../../core/models';
import { APP_ROUTE_COMMANDS } from '../../core/routes';
import {
  AccessibilityService,
  FontScale,
  I18nService,
  LocaleMetadata,
  SpeechRate,
  TelemetryService,
  ThemeService,
} from '../../core/services';
import { SchemaTranslatePipe } from '../../shared/pipes';

interface SpeechRateOption {
  readonly value: SpeechRate;
  readonly labelKey: string;
  readonly tag: string;
}

interface FontScaleOption {
  readonly value: FontScale;
  readonly labelKey: string;
  readonly badge: string;
}

@Component({
  selector: 'app-header',
  imports: [FormsModule, RouterLink, MatSlideToggleModule, MatTooltipModule, SchemaTranslatePipe],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeaderComponent {
  private readonly hostElement = inject(ElementRef<HTMLElement>);
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);
  protected readonly accessibility = inject(AccessibilityService);
  private readonly telemetry = inject(TelemetryService);

  protected readonly langMenuOpen = signal(false);
  protected readonly a11yPanelOpen = signal(false);
  protected readonly dashboardRoute = APP_ROUTE_COMMANDS.dashboard;

  protected readonly supportedLanguages: readonly LocaleMetadata[] = this.i18n.availableLocales;

  protected readonly speechRates: readonly SpeechRateOption[] = [
    { value: 0.85, labelKey: 'a11ySpeechSlow', tag: '0.85x' },
    { value: 1, labelKey: 'a11ySpeechNormal', tag: '1x' },
    { value: 1.2, labelKey: 'a11ySpeechFast', tag: '1.2x' },
  ];

  protected readonly fontScales: readonly FontScaleOption[] = [
    { value: 'normal', labelKey: 'a11yFontNormal', badge: 'A' },
    { value: 'large', labelKey: 'a11yFontLarge', badge: 'A+' },
    { value: 'xlarge', labelKey: 'a11yFontXLarge', badge: 'A++' },
  ];

  protected readonly currentLangShort = computed<string>(() =>
    this.i18n.currentLang() === 'pt-BR' ? 'PT' : 'EN',
  );

  @HostListener('document:keydown.escape')
  protected onEscapePressed(): void {
    if (this.langMenuOpen() || this.a11yPanelOpen()) {
      this.closePopovers();
    }
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.langMenuOpen() && !this.a11yPanelOpen()) {
      return;
    }

    const utilitiesEl = this.hostElement.nativeElement.querySelector('.app-shell__utilities');
    const target = event.target as Node | null;
    if (utilitiesEl && target && !utilitiesEl.contains(target)) {
      this.closePopovers();
    }
  }

  protected onToggleTheme(): void {
    const nextMode = this.theme.toggleTheme();
    this.telemetry.trackEvent('theme_changed', { theme: nextMode });
    const key = nextMode === 'dark' ? 'themeDarkActive' : 'themeLightActive';
    this.accessibility.announce(this.i18n.translateUi(key));
  }

  protected toggleLangMenu(): void {
    const next = !this.langMenuOpen();
    this.langMenuOpen.set(next);
    if (next) {
      this.a11yPanelOpen.set(false);
    }
  }

  protected selectLanguage(lang: SupportedLanguage): void {
    this.i18n.setLanguage(lang);
    this.langMenuOpen.set(false);
    this.telemetry.trackEvent('language_changed', { language: lang });
    this.accessibility.announce(this.i18n.translateUi('languageChanged'));
  }

  protected toggleA11yPanel(): void {
    const next = !this.a11yPanelOpen();
    this.a11yPanelOpen.set(next);
    if (next) {
      this.langMenuOpen.set(false);
    }
  }

  protected closePopovers(): void {
    this.langMenuOpen.set(false);
    this.a11yPanelOpen.set(false);
  }

  protected onNavigateToDashboard(event: MouseEvent): void {
    this.closePopovers();
    if (
      event.button === 0 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      event.preventDefault();
      void this.router.navigate(this.dashboardRoute);
    }
  }
}
