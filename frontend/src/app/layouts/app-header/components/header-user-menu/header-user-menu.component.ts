import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTooltipModule } from '@angular/material/tooltip';
import { take } from 'rxjs';
import { AuthService, I18nService, UiFeedbackHostService } from '../../../../core/services';
import { SchemaTranslatePipe } from '../../../../shared/pipes';

/**
 * Isolated authenticated user icon button, account summary popover, and sign-out action.
 */
@Component({
  selector: 'app-header-user-menu',
  imports: [MatTooltipModule, SchemaTranslatePipe],
  templateUrl: './header-user-menu.component.html',
  styleUrl: './header-user-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderUserMenuComponent {
  private readonly destroyRef = inject(DestroyRef);
  protected readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly feedback = inject(UiFeedbackHostService);

  readonly isOpen = input<boolean>(false);
  readonly toggleRequested = output<void>();
  readonly closed = output<void>();

  protected onLogout(): void {
    this.closed.emit();
    this.auth
      .logout()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.feedback.info(this.i18n.translateUi('authLogoutSuccess'));
        },
      });
  }
}
