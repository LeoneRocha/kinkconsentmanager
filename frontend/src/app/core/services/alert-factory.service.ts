import { Injectable, inject, signal } from '@angular/core';
import { I18nService } from './i18n.service';
import {
  NotificationChannel,
  NotificationConfig,
  NotificationPosition,
  NotificationService,
  NotificationType,
} from './notification.service';

export type AlertEngine = 'toast' | 'snackbar' | 'sweetalert';
export type AlertProvider = AlertEngine | (string & {});
export type AlertSeverity = NotificationType;

export interface AlertRequest {
  readonly severity: AlertSeverity;
  readonly message: string;
  readonly actionLabel?: string;
  readonly duration?: number;
  readonly position?: NotificationPosition;
  readonly provider?: AlertProvider;
  /** @deprecated Prefira `provider`. Mantido por compatibilidade. */
  readonly engine?: AlertEngine;
  readonly onAction?: () => void;
}

export interface AlertResolvedRequest {
  readonly severity: AlertSeverity;
  readonly message: string;
  readonly actionLabel: string;
  readonly duration?: number;
  readonly position?: NotificationPosition;
  readonly onAction?: () => void;
}

export interface AlertProviderAdapter {
  open(request: AlertResolvedRequest): void;
  dismiss(id?: number): void;
}

/**
 * Factory centralizada com registro extensível de adaptadores/provedores de alertas.
 * Permite trocar ou plugar novos provedores (`toast`, `snackbar`, `sweetalert`, custom)
 * sem impactar nenhuma tela ou componente consumidor.
 */
@Injectable({ providedIn: 'root' })
export class AlertFactoryService {
  private readonly notifications = inject(NotificationService);
  private readonly i18n = inject(I18nService);

  private readonly adapters = new Map<string, AlertProviderAdapter>();
  private readonly _defaultEngine = signal<AlertEngine>('toast');

  readonly defaultEngine = this._defaultEngine.asReadonly();
  readonly defaultProvider = this._defaultEngine.asReadonly();

  constructor() {
    this.registerProvider('toast', this.createNotificationAdapter(NotificationChannel.Toast));
    this.registerProvider('snackbar', this.createNotificationAdapter(NotificationChannel.MatSnackBar));
    this.registerProvider(
      'sweetalert',
      this.createNotificationAdapter(NotificationChannel.SweetAlert2),
    );
  }

  registerProvider(name: string, adapter: AlertProviderAdapter): void {
    this.adapters.set(name, adapter);
  }

  open(request: AlertRequest): void {
    const providerKey = request.provider ?? request.engine ?? this._defaultEngine();
    const adapter =
      this.adapters.get(providerKey) ?? this.adapters.get(this._defaultEngine());
    if (!adapter) {
      return;
    }

    const actionLabel = request.actionLabel ?? this.i18n.translateUi('notificationOkAction');
    adapter.open({
      severity: request.severity,
      message: request.message,
      actionLabel,
      duration: request.duration,
      position: request.position,
      onAction: request.onAction,
    });
  }

  success(message: string, options?: Omit<AlertRequest, 'severity' | 'message'>): void {
    this.open({ severity: 'success', message, ...options });
  }

  error(message: string, options?: Omit<AlertRequest, 'severity' | 'message'>): void {
    this.open({ severity: 'error', message, ...options });
  }

  warning(message: string, options?: Omit<AlertRequest, 'severity' | 'message'>): void {
    this.open({ severity: 'warning', message, ...options });
  }

  info(message: string, options?: Omit<AlertRequest, 'severity' | 'message'>): void {
    this.open({ severity: 'info', message, ...options });
  }

  dismiss(toastId?: number): void {
    for (const adapter of this.adapters.values()) {
      adapter.dismiss(toastId);
    }
  }

  setDefaultEngine(engine: AlertEngine): () => void {
    const previous = this._defaultEngine();
    this._defaultEngine.set(engine);
    return () => {
      this._defaultEngine.set(previous);
    };
  }

  setDefaultPosition(position: NotificationPosition): () => void {
    return this.notifications.setDefaultPosition(position);
  }

  private createNotificationAdapter(channel: NotificationChannel): AlertProviderAdapter {
    return {
      open: (resolved) => {
        const config: NotificationConfig = {
          channel,
          onAction: resolved.onAction,
          ...(typeof resolved.duration === 'number' ? { duration: resolved.duration } : {}),
          ...(resolved.position?.vertical ? { verticalPosition: resolved.position.vertical } : {}),
          ...(resolved.position?.horizontal
            ? { horizontalPosition: resolved.position.horizontal }
            : {}),
        };

        switch (resolved.severity) {
          case 'success':
            this.notifications.success(resolved.message, resolved.actionLabel, config);
            break;
          case 'error':
            this.notifications.error(resolved.message, resolved.actionLabel, config);
            break;
          case 'warning':
            this.notifications.warning(resolved.message, resolved.actionLabel, config);
            break;
          default:
            this.notifications.info(resolved.message, resolved.actionLabel, config);
            break;
        }
      },
      dismiss: (id) => {
        this.notifications.dismiss(id);
      },
    };
  }
}
