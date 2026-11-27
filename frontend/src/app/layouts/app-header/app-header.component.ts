import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { APP_ROUTE_COMMANDS } from '../../core/routes';
import { SchemaTranslatePipe } from '../../shared/pipes';
import { HeaderUtilitiesComponent } from './components';

@Component({
  selector: 'app-header',
  imports: [RouterLink, SchemaTranslatePipe, HeaderUtilitiesComponent],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeaderComponent {
  private readonly router = inject(Router);
  private readonly utilities = viewChild(HeaderUtilitiesComponent);

  protected readonly dashboardRoute = APP_ROUTE_COMMANDS.dashboard;

  protected onNavigateToDashboard(event: MouseEvent): void {
    this.utilities()?.closePopovers();
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
