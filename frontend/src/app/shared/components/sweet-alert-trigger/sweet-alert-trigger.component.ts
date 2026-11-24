import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import type { SweetAlertIcon, SweetAlertPosition } from 'sweetalert2';
import { I18nService, SweetAlertService } from '../../../core/services';

export type SweetAlertTriggerMode = 'alert' | 'confirm' | 'toast';

/**
 * Componente wrapper declarativo para disparar alertas, confirmações e toasts
 * encapsulando `SweetAlertService` (`sweetalert2`).
 */
@Component({
  selector: 'app-sweet-alert-trigger',
  templateUrl: './sweet-alert-trigger.component.html',
  styleUrl: './sweet-alert-trigger.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppSweetAlertTriggerComponent {
  private readonly sweetAlert = inject(SweetAlertService);
  private readonly i18n = inject(I18nService);

  readonly mode = input<SweetAlertTriggerMode>('confirm');
  readonly title = input<string>('');
  readonly text = input<string>('');
  readonly icon = input<SweetAlertIcon>('question');
  readonly confirmText = input<string>('');
  readonly cancelText = input<string>('');
  readonly toastPosition = input<SweetAlertPosition>('top-end');
  readonly timer = input<number>(4000);
  readonly disabled = input<boolean>(false);

  readonly confirmed = output<void>();
  readonly dismissed = output<void>();

  async open(): Promise<void> {
    if (this.disabled()) {
      return;
    }

    const resolvedTitle = this.title() || this.i18n.translateUi('dialogDefaultTitle');
    const resolvedConfirmText =
      this.confirmText() || this.i18n.translateUi('dialogConfirmAction');
    const resolvedCancelText =
      this.cancelText() || this.i18n.translateUi('dialogCancelAction');

    const activeMode = this.mode();
    if (activeMode === 'toast') {
      await this.sweetAlert.toast(
        this.text() || resolvedTitle,
        this.icon(),
        this.toastPosition(),
        this.timer(),
      );
      this.confirmed.emit();
      return;
    }

    if (activeMode === 'alert') {
      const result = await this.sweetAlert.alert(
        resolvedTitle,
        this.text(),
        this.icon(),
        resolvedConfirmText,
      );
      if (result.isConfirmed) {
        this.confirmed.emit();
      } else {
        this.dismissed.emit();
      }
      return;
    }

    const ok = await this.sweetAlert.confirm({
      title: resolvedTitle,
      text: this.text(),
      icon: this.icon(),
      confirmButtonText: resolvedConfirmText,
      cancelButtonText: resolvedCancelText,
    });
    if (ok) {
      this.confirmed.emit();
    } else {
      this.dismissed.emit();
    }
  }
}
