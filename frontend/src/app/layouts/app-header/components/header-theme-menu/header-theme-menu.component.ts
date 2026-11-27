import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  AccessibilityService,
  I18nService,
  TelemetryService,
  ThemeMode,
  ThemePresetDefinition,
  ThemeService,
} from '../../../../core/services';
import { SchemaTranslatePipe } from '../../../../shared/pipes';

/**
 * Isolated theme selector icon button and dropdown menu in the topbar utilities.
 */
@Component({
  selector: 'app-header-theme-menu',
  imports: [MatTooltipModule, SchemaTranslatePipe],
  templateUrl: './header-theme-menu.component.html',
  styleUrl: './header-theme-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderThemeMenuComponent {
  protected readonly theme = inject(ThemeService);
  private readonly i18n = inject(I18nService);
  private readonly accessibility = inject(AccessibilityService);
  private readonly telemetry = inject(TelemetryService);

  readonly isOpen = input<boolean>(false);
  readonly toggleRequested = output<void>();
  readonly closed = output<void>();

  protected readonly themePresets: readonly ThemePresetDefinition[] = this.theme.presets;

  protected selectTheme(mode: ThemeMode): void {
    const preset = this.themePresets.find((item) => item.id === mode);
    this.theme.setTheme(mode);
    this.closed.emit();
    this.telemetry.trackEvent('theme_changed', { theme: mode });
    if (preset) {
      this.accessibility.announce(this.i18n.translateUi(preset.activeAnnouncementKey));
    }
  }
}
