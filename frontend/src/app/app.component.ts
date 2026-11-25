import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
})
export class App {}
