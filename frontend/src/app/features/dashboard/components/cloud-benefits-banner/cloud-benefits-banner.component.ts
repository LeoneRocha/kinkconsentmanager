import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AuthUser } from '../../../../core/models';
import { SchemaTranslatePipe } from '../../../../shared/pipes';

/**
 * Cartão desacoplado de apresentação dos benefícios em nuvem e estado da sessão autenticada.
 */
@Component({
  selector: 'app-cloud-benefits-banner',
  imports: [SchemaTranslatePipe],
  templateUrl: './cloud-benefits-banner.component.html',
  styleUrl: './cloud-benefits-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CloudBenefitsBannerComponent {
  readonly user = input<AuthUser | null>(null);
  readonly isLoggingOut = input<boolean>(false);

  readonly advanceRequested = output<void>();
  readonly logoutRequested = output<void>();

  protected readonly userInitial = computed<string>(() => {
    const current = this.user();
    if (!current) {
      return '';
    }
    const source = (current.name || current.login).trim();
    return source ? source.charAt(0).toUpperCase() : '?';
  });

  protected onAdvanceClick(): void {
    this.advanceRequested.emit();
  }

  protected onLogoutClick(): void {
    if (!this.isLoggingOut()) {
      this.logoutRequested.emit();
    }
  }
}
