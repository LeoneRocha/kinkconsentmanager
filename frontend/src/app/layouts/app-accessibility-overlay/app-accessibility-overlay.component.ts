import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AccessibilityService } from '../../core/services';
import { SchemaTranslatePipe } from '../../shared/pipes';

@Component({
  selector: 'app-accessibility-overlay',
  imports: [SchemaTranslatePipe],
  templateUrl: './app-accessibility-overlay.component.html',
  styleUrl: './app-accessibility-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppAccessibilityOverlayComponent {
  protected readonly accessibility = inject(AccessibilityService);
}
