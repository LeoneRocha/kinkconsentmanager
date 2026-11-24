import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Placement } from '@popperjs/core';
import { take } from 'rxjs';
import {
  AlertEngine,
  AlertProvider,
  AlertSeverity,
  FeedbackProvider,
  ModalEngine,
  ModalProvider,
  NotificationPosition,
  UiFeedbackHostService,
} from '../../../core/services';
import {
  AppPopperPopoverComponent,
  PopperTriggerMode,
} from '../popper-popover/popper-popover.component';

export type PopupKind = 'popover' | 'alert' | 'modal';
export type PopupModalType = 'confirm' | 'alert';

/**
 * Host declarativo central para feedback e overlays por tipo (`kind`) e provedor (`provider`).
 * Encapsula `UiFeedbackHostService` e adaptadores especializados (`Popper.js`, `Toast`, `SnackBar`,
 * `Material Dialog`, `SweetAlert2`), garantindo ponto único de substituição.
 */
@Component({
  selector: 'app-popup-host',
  imports: [AppPopperPopoverComponent],
  templateUrl: './popup-host.component.html',
  styleUrl: './popup-host.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppPopupHostComponent {
  private readonly feedbackHost = inject(UiFeedbackHostService);
  private readonly destroyRef = inject(DestroyRef);

  readonly kind = input<PopupKind>('popover');
  readonly provider = input<FeedbackProvider | undefined>(undefined);
  readonly modalType = input<PopupModalType>('confirm');
  /** @deprecated Prefira `provider`. */
  readonly alertEngine = input<AlertEngine | undefined>(undefined);
  /** @deprecated Prefira `provider`. */
  readonly modalEngine = input<ModalEngine | undefined>(undefined);

  readonly severity = input<AlertSeverity>('info');
  readonly title = input<string>('');
  readonly message = input<string>('');
  readonly actionLabel = input<string>('');
  readonly cancelLabel = input<string>('');
  readonly danger = input<boolean>(false);
  readonly duration = input<number | undefined>(undefined);
  readonly position = input<NotificationPosition | undefined>(undefined);

  readonly placement = input<Placement>('bottom-end');
  readonly offset = input<readonly [number, number]>([0, 8]);
  readonly trigger = input<PopperTriggerMode>('click');
  readonly closeOnOutsideClick = input<boolean>(true);
  readonly closeOnEscape = input<boolean>(true);
  readonly ariaLabel = input<string>('');
  readonly disabled = input<boolean>(false);

  readonly isOpen = model<boolean>(false);

  readonly confirmed = output<void>();
  readonly dismissed = output<void>();
  readonly opened = output<void>();
  readonly closed = output<void>();

  triggerAction(): void {
    if (this.disabled()) {
      return;
    }

    const activeKind = this.kind();
    if (activeKind === 'popover') {
      this.isOpen.set(!this.isOpen());
      return;
    }

    const selectedProvider = this.provider();

    if (activeKind === 'alert') {
      const alertProvider: AlertProvider | undefined =
        selectedProvider && selectedProvider !== 'popper' && selectedProvider !== 'material'
          ? (selectedProvider as AlertProvider)
          : this.alertEngine();

      this.feedbackHost.open({
        kind: 'alert',
        severity: this.severity(),
        message: this.message() || this.title(),
        actionLabel: this.actionLabel() || undefined,
        duration: this.duration(),
        position: this.position(),
        provider: alertProvider,
      });
      this.opened.emit();
      return;
    }

    const modalProvider: ModalProvider | undefined =
      selectedProvider === 'material' || selectedProvider === 'sweetalert'
        ? selectedProvider
        : this.modalEngine();

    const obs =
      this.modalType() === 'alert'
        ? this.feedbackHost.open({
            kind: 'modal',
            modalType: 'alert',
            title: this.title() || undefined,
            message: this.message(),
            confirmLabel: this.actionLabel() || undefined,
            provider: modalProvider,
          })
        : this.feedbackHost.open({
            kind: 'modal',
            modalType: 'confirm',
            title: this.title() || undefined,
            message: this.message(),
            confirmLabel: this.actionLabel() || undefined,
            cancelLabel: this.cancelLabel() || undefined,
            danger: this.danger(),
            provider: modalProvider,
          });

    this.opened.emit();
    obs
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((accepted) => {
        if (accepted) {
          this.confirmed.emit();
        } else {
          this.dismissed.emit();
        }
        this.closed.emit();
      });
  }
}
