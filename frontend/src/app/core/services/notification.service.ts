import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { I18nService } from './i18n.service';
import { SweetAlertService } from './sweet-alert.service';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationPosition {
  readonly vertical?: 'top' | 'bottom';
  readonly horizontal?: 'left' | 'center' | 'right';
}

export enum NotificationChannel {
  Toast = 'Toast',
  MatSnackBar = 'MatSnackBar',
  SweetAlert2 = 'SweetAlert2',
}

export interface NotificationConfig extends MatSnackBarConfig {
  type?: NotificationType;
  channel?: NotificationChannel;
  onAction?: () => void;
}

export interface ToastNotification {
  readonly id: number;
  readonly message: string;
  readonly actionLabel?: string;
  readonly type: NotificationType;
  readonly position: Required<NotificationPosition>;
  readonly duration: number;
  readonly onAction?: () => void;
}

const SNACKBAR_PANEL_CLASS: Record<NotificationType, string> = {
  success: 'kcm-snackbar-success',
  error: 'kcm-snackbar-error',
  warning: 'kcm-snackbar-warning',
  info: 'kcm-snackbar-info',
};

const SWEET_ALERT_TITLE_KEYS: Record<NotificationType, string> = {
  success: 'notificationTitleSuccess',
  error: 'notificationTitleError',
  warning: 'notificationTitleWarning',
  info: 'notificationTitleInfo',
};

/**
 * Serviço centralizado e desacoplado de notificações.
 * Padrão configurado para Toast flutuante no topo direito (`top-right`),
 * com suporte intercambiável para `Toast`, `MatSnackBar` e `SweetAlert2`.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);
  private readonly sweetAlert = inject(SweetAlertService);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  private nextToastId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  private readonly _toasts = signal<readonly ToastNotification[]>([]);
  private readonly _defaultChannel = signal<NotificationChannel>(NotificationChannel.Toast);
  private readonly _defaultPosition = signal<Required<NotificationPosition>>({
    vertical: 'top',
    horizontal: 'center',
  });

  readonly toasts = this._toasts.asReadonly();
  readonly defaultChannel = this._defaultChannel.asReadonly();
  readonly defaultPosition = this._defaultPosition.asReadonly();

  constructor() {
    this.destroyRef.onDestroy(() => this.clearAllTimers());
  }

  success(message: string, action?: string, config?: NotificationConfig): void {
    this.show(message, action, {
      duration: 4000,
      ...config,
      type: 'success',
      panelClass: config?.panelClass ?? [SNACKBAR_PANEL_CLASS.success],
    });
  }

  error(message: string, action?: string, config?: NotificationConfig): void {
    this.show(message, action, {
      duration: 5000,
      ...config,
      type: 'error',
      panelClass: config?.panelClass ?? [SNACKBAR_PANEL_CLASS.error],
    });
  }

  warning(message: string, action?: string, config?: NotificationConfig): void {
    this.show(message, action, {
      duration: 4500,
      ...config,
      type: 'warning',
      panelClass: config?.panelClass ?? [SNACKBAR_PANEL_CLASS.warning],
    });
  }

  info(message: string, action?: string, config?: NotificationConfig): void {
    this.show(message, action, {
      duration: 4000,
      ...config,
      type: 'info',
      panelClass: config?.panelClass ?? [SNACKBAR_PANEL_CLASS.info],
    });
  }

  show(
    message: string,
    action?: string,
    config?: NotificationConfig,
  ): MatSnackBarRef<TextOnlySnackBar> | undefined {
    const defaultPos = this._defaultPosition();
    const resolvedPosition: Required<NotificationPosition> = {
      vertical: config?.verticalPosition ?? defaultPos.vertical,
      horizontal:
        config?.horizontalPosition === 'start'
          ? 'left'
          : config?.horizontalPosition === 'end'
            ? 'right'
            : (config?.horizontalPosition ?? defaultPos.horizontal),
    };
    const finalConfig: NotificationConfig = {
      duration: 4000,
      verticalPosition: resolvedPosition.vertical,
      horizontalPosition: resolvedPosition.horizontal,
      ...config,
    };

    const channel = finalConfig.channel ?? this._defaultChannel();

    if (channel === NotificationChannel.SweetAlert2) {
      const type = finalConfig.type ?? 'info';
      const timer =
        typeof finalConfig.duration === 'number' && finalConfig.duration > 0
          ? finalConfig.duration
          : undefined;

      void this.sweetAlert.fire({
        icon: type,
        title: this.i18n.translateUi(SWEET_ALERT_TITLE_KEYS[type]),
        text: message,
        confirmButtonText: action ?? this.i18n.translateUi('notificationOkAction'),
        showConfirmButton: true,
        timer,
        timerProgressBar: Boolean(timer),
      });
      return undefined;
    }

    if (channel === NotificationChannel.MatSnackBar) {
      return this.snackBar.open(message, action, finalConfig);
    }

    this.enqueueToast({
      id: this.nextToastId++,
      message,
      actionLabel: action,
      type: finalConfig.type ?? 'info',
      position: resolvedPosition,
      duration: typeof finalConfig.duration === 'number' ? finalConfig.duration : 4000,
      onAction: finalConfig.onAction,
    });
    return undefined;
  }

  open(
    message: string,
    action?: string,
    config?: NotificationConfig,
  ): MatSnackBarRef<TextOnlySnackBar> | undefined;
  open(
    message: string,
    action: string | undefined,
    config: NotificationConfig | undefined,
    channel: NotificationChannel,
  ): MatSnackBarRef<TextOnlySnackBar> | undefined;
  open(
    message: string,
    action: string | undefined,
    config: NotificationConfig | undefined,
    position: NotificationPosition,
  ): MatSnackBarRef<TextOnlySnackBar> | undefined;
  open(
    message: string,
    action: string | undefined,
    config: NotificationConfig | undefined,
    channel: NotificationChannel,
    position: NotificationPosition,
  ): MatSnackBarRef<TextOnlySnackBar> | undefined;
  open(
    message: string,
    action?: string,
    config?: NotificationConfig,
    channelOrPosition?: NotificationChannel | NotificationPosition,
    positionArg?: NotificationPosition,
  ): MatSnackBarRef<TextOnlySnackBar> | undefined {
    const channel = typeof channelOrPosition === 'string' ? channelOrPosition : undefined;
    const position = typeof channelOrPosition === 'string' ? positionArg : channelOrPosition;
    const mergedConfig: NotificationConfig = {
      ...config,
      ...(position?.vertical ? { verticalPosition: position.vertical } : {}),
      ...(position?.horizontal ? { horizontalPosition: position.horizontal } : {}),
      ...(channel ? { channel } : {}),
    };
    return this.show(message, action, mergedConfig);
  }

  dismiss(toastId?: number): void {
    if (typeof toastId === 'number') {
      this.clearTimer(toastId);
      this._toasts.update((items) => items.filter((item) => item.id !== toastId));
      return;
    }

    this.clearAllTimers();
    this._toasts.set([]);
    this.snackBar.dismiss();
    void this.sweetAlert.close();
  }

  triggerAction(toastId: number): void {
    const target = this._toasts().find((item) => item.id === toastId);
    if (!target) {
      return;
    }
    target.onAction?.();
    this.dismiss(toastId);
  }

  setChannel(channel: NotificationChannel): () => void {
    const previous = this._defaultChannel();
    this._defaultChannel.set(channel);
    return () => {
      this._defaultChannel.set(previous);
    };
  }

  setDefaultPosition(position: NotificationPosition): () => void {
    const previous = this._defaultPosition();
    this._defaultPosition.set({
      vertical: position.vertical ?? previous.vertical,
      horizontal: position.horizontal ?? previous.horizontal,
    });
    return () => {
      this._defaultPosition.set(previous);
    };
  }

  private enqueueToast(toast: ToastNotification): void {
    this._toasts.update((items) => [...items.slice(-4), toast]);

    if (toast.duration > 0) {
      const handle = setTimeout(() => {
        this.dismiss(toast.id);
      }, toast.duration);
      this.timers.set(toast.id, handle);
    }
  }

  private clearTimer(id: number): void {
    const handle = this.timers.get(id);
    if (handle !== undefined) {
      clearTimeout(handle);
      this.timers.delete(id);
    }
  }

  private clearAllTimers(): void {
    for (const handle of this.timers.values()) {
      clearTimeout(handle);
    }
    this.timers.clear();
  }
}
