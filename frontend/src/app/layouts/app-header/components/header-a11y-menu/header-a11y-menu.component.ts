import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AccessibilityService, FontScale, SpeechRate } from '../../../../core/services';
import { SchemaTranslatePipe } from '../../../../shared/pipes';

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

/**
 * Isolated accessibility and audiovisual controls button and panel in the topbar utilities.
 */
@Component({
  selector: 'app-header-a11y-menu',
  imports: [FormsModule, MatSlideToggleModule, MatTooltipModule, SchemaTranslatePipe],
  templateUrl: './header-a11y-menu.component.html',
  styleUrl: './header-a11y-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderA11yMenuComponent {
  protected readonly accessibility = inject(AccessibilityService);

  readonly isOpen = input<boolean>(false);
  readonly toggleRequested = output<void>();
  readonly closed = output<void>();

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
}
