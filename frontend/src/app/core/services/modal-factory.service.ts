import { ComponentType } from '@angular/cdk/portal';
import { Injectable, inject, signal } from '@angular/core';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { Observable, from, map } from 'rxjs';
import { SweetAlertIcon } from 'sweetalert2';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { I18nService } from './i18n.service';
import { SweetAlertService } from './sweet-alert.service';

export type ModalEngine = 'material' | 'sweetalert';
export type ModalProvider = ModalEngine | (string & {});

export interface ConfirmModalRequest {
  readonly title?: string;
  readonly message: string;
  readonly icon?: string;
  readonly sweetAlertIcon?: SweetAlertIcon;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly danger?: boolean;
  readonly width?: string;
  readonly provider?: ModalProvider;
  /** @deprecated Prefira `provider`. Mantido por compatibilidade. */
  readonly engine?: ModalEngine;
}

export interface AlertModalRequest {
  readonly title?: string;
  readonly message: string;
  readonly icon?: string;
  readonly sweetAlertIcon?: SweetAlertIcon;
  readonly confirmLabel?: string;
  readonly width?: string;
  readonly provider?: ModalProvider;
  /** @deprecated Prefira `provider`. Mantido por compatibilidade. */
  readonly engine?: ModalEngine;
}

export interface ResolvedConfirmModalRequest {
  readonly title: string;
  readonly message: string;
  readonly icon: string;
  readonly sweetAlertIcon: SweetAlertIcon;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly danger?: boolean;
  readonly width: string;
}

export interface ResolvedAlertModalRequest {
  readonly title: string;
  readonly message: string;
  readonly icon: string;
  readonly sweetAlertIcon: SweetAlertIcon;
  readonly confirmLabel: string;
  readonly width: string;
}

export interface ModalProviderAdapter {
  confirm(request: ResolvedConfirmModalRequest): Observable<boolean>;
  alert(request: ResolvedAlertModalRequest): Observable<boolean>;
  closeAll(): void;
}

export interface CustomModalRequest<TData = unknown> {
  readonly component: ComponentType<unknown>;
  readonly config?: MatDialogConfig<TData>;
}

/**
 * Factory centralizada com registro extensível de adaptadores/provedores de modais.
 * Roteia confirmações e alertas modais para `material`, `sweetalert` ou adaptadores customizados.
 */
@Injectable({ providedIn: 'root' })
export class ModalFactoryService {
  private readonly dialog = inject(MatDialog);
  private readonly sweetAlert = inject(SweetAlertService);
  private readonly i18n = inject(I18nService);

  private readonly adapters = new Map<string, ModalProviderAdapter>();
  private readonly _defaultEngine = signal<ModalEngine>('material');

  readonly defaultEngine = this._defaultEngine.asReadonly();
  readonly defaultProvider = this._defaultEngine.asReadonly();

  constructor() {
    this.registerProvider('material', this.createMaterialAdapter());
    this.registerProvider('sweetalert', this.createSweetAlertAdapter());
  }

  registerProvider(name: string, adapter: ModalProviderAdapter): void {
    this.adapters.set(name, adapter);
  }

  confirm(request: ConfirmModalRequest): Observable<boolean> {
    const providerKey = request.provider ?? request.engine ?? this._defaultEngine();
    const adapter =
      this.adapters.get(providerKey) ?? this.adapters.get(this._defaultEngine())!;

    return adapter.confirm({
      title: request.title || this.i18n.translateUi('dialogDefaultTitle'),
      message: request.message,
      icon: request.icon ?? 'fa-solid fa-triangle-exclamation',
      sweetAlertIcon: request.sweetAlertIcon ?? (request.danger ? 'warning' : 'question'),
      confirmLabel: request.confirmLabel || this.i18n.translateUi('dialogConfirmAction'),
      cancelLabel: request.cancelLabel || this.i18n.translateUi('dialogCancelAction'),
      danger: request.danger,
      width: request.width ?? 'min(92vw, 28rem)',
    });
  }

  alert(request: AlertModalRequest): Observable<boolean> {
    const providerKey = request.provider ?? request.engine ?? this._defaultEngine();
    const adapter =
      this.adapters.get(providerKey) ?? this.adapters.get(this._defaultEngine())!;

    return adapter.alert({
      title: request.title || this.i18n.translateUi('dialogDefaultTitle'),
      message: request.message,
      icon: request.icon ?? 'fa-solid fa-circle-info',
      sweetAlertIcon: request.sweetAlertIcon ?? 'info',
      confirmLabel: request.confirmLabel || this.i18n.translateUi('notificationOkAction'),
      width: request.width ?? 'min(92vw, 28rem)',
    });
  }

  openComponent<TComponent = unknown, TData = unknown, TResult = unknown>(
    request: CustomModalRequest<TData>,
  ): MatDialogRef<TComponent, TResult> {
    return this.dialog.open<TComponent, TData, TResult>(
      request.component as ComponentType<TComponent>,
      request.config,
    );
  }

  closeAll(): void {
    for (const adapter of this.adapters.values()) {
      adapter.closeAll();
    }
  }

  setDefaultEngine(engine: ModalEngine): () => void {
    const previous = this._defaultEngine();
    this._defaultEngine.set(engine);
    return () => {
      this._defaultEngine.set(previous);
    };
  }

  private createMaterialAdapter(): ModalProviderAdapter {
    return {
      confirm: (resolved) => {
        const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
          ConfirmDialogComponent,
          {
            width: resolved.width,
            data: {
              header: resolved.title,
              message: resolved.message,
              icon: resolved.icon,
              acceptLabel: resolved.confirmLabel,
              rejectLabel: resolved.cancelLabel,
              danger: resolved.danger,
            },
          },
        );
        return ref.afterClosed().pipe(map((result) => result === true));
      },
      alert: (resolved) => {
        const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
          ConfirmDialogComponent,
          {
            width: resolved.width,
            data: {
              header: resolved.title,
              message: resolved.message,
              icon: resolved.icon,
              acceptLabel: resolved.confirmLabel,
            },
          },
        );
        return ref.afterClosed().pipe(map((result) => result === true));
      },
      closeAll: () => {
        this.dialog.closeAll();
      },
    };
  }

  private createSweetAlertAdapter(): ModalProviderAdapter {
    return {
      confirm: (resolved) =>
        from(
          this.sweetAlert.confirm({
            title: resolved.title,
            text: resolved.message,
            icon: resolved.sweetAlertIcon,
            confirmButtonText: resolved.confirmLabel,
            cancelButtonText: resolved.cancelLabel,
          }),
        ),
      alert: (resolved) =>
        from(
          this.sweetAlert.alert(
            resolved.title,
            resolved.message,
            resolved.sweetAlertIcon,
            resolved.confirmLabel,
          ),
        ).pipe(map((result) => Boolean(result.isConfirmed))),
      closeAll: () => {
        void this.sweetAlert.close();
      },
    };
  }
}
