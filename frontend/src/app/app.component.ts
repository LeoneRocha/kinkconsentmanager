import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AccessibilityService } from './core/services';
import {
  AppAccessibilityOverlayComponent,
  AppFooterComponent,
  AppHeaderComponent,
} from './layouts';
import { AppImportLoadingOverlayComponent, AppToastContainerComponent } from './shared/components';
import { SchemaTranslatePipe } from './shared/pipes';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    SchemaTranslatePipe,
    AppHeaderComponent,
    AppFooterComponent,
    AppAccessibilityOverlayComponent,
    AppToastContainerComponent,
    AppImportLoadingOverlayComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(focusin)': 'onFocusIn($event)',
  },
})
export class App {
  private readonly accessibility = inject(AccessibilityService);

  protected onFocusIn(event: FocusEvent): void {
    if (event.target instanceof Element) {
      this.accessibility.announceElement(event.target);
    }
  }
}
