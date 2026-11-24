import { Injectable, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import {
  AlertFactoryService,
  AlertProvider,
  AlertRequest,
} from './alert-factory.service';
import {
  AlertModalRequest,
  ConfirmModalRequest,
  CustomModalRequest,
  ModalFactoryService,
  ModalProvider,
} from './modal-factory.service';

export type FeedbackProvider = AlertProvider | ModalProvider | 'popper';

export type UiFeedbackRequest =
  | ({ readonly kind: 'alert' } & AlertRequest)
  | ({ readonly kind: 'modal'; readonly modalType?: 'confirm' } & ConfirmModalRequest)
  | ({ readonly kind: 'modal'; readonly modalType: 'alert' } & AlertModalRequest);

/**
 * Host programático único centralizado para todo feedback de UI (alertas, toasts e modais).
 * As telas e componentes chamam exclusivamente este Host informando o tipo (`kind`) e o
 * adaptador/provedor (`provider`), mantendo 100% de desacoplamento das bibliotecas concretas.
 */
@Injectable({ providedIn: 'root' })
export class UiFeedbackHostService {
  private readonly alertFactory = inject(AlertFactoryService);
  private readonly modalFactory = inject(ModalFactoryService);

  open(request: { readonly kind: 'alert' } & AlertRequest): void;
  open(request: { readonly kind: 'modal'; readonly modalType?: 'confirm' } & ConfirmModalRequest): Observable<boolean>;
  open(request: { readonly kind: 'modal'; readonly modalType: 'alert' } & AlertModalRequest): Observable<boolean>;
  open(request: UiFeedbackRequest): Observable<boolean> | void;
  open(request: UiFeedbackRequest): Observable<boolean> | void {
    if (request.kind === 'alert') {
      const { kind: _kind, ...alertReq } = request;
      this.alertFactory.open(alertReq);
      return;
    }

    if (request.modalType === 'alert') {
      const { kind: _kind, modalType: _modalType, ...modalAlertReq } = request;
      return this.modalFactory.alert(modalAlertReq);
    }

    const { kind: _kind, modalType: _modalType, ...confirmReq } = request;
    return this.modalFactory.confirm(confirmReq);
  }

  success(message: string, options?: Omit<AlertRequest, 'severity' | 'message'>): void {
    this.alertFactory.success(message, options);
  }

  error(message: string, options?: Omit<AlertRequest, 'severity' | 'message'>): void {
    this.alertFactory.error(message, options);
  }

  warning(message: string, options?: Omit<AlertRequest, 'severity' | 'message'>): void {
    this.alertFactory.warning(message, options);
  }

  info(message: string, options?: Omit<AlertRequest, 'severity' | 'message'>): void {
    this.alertFactory.info(message, options);
  }

  confirm(request: ConfirmModalRequest): Observable<boolean> {
    return this.modalFactory.confirm(request);
  }

  modalAlert(request: AlertModalRequest): Observable<boolean> {
    return this.modalFactory.alert(request);
  }

  openCustomModal<TComponent = unknown, TData = unknown, TResult = unknown>(
    request: CustomModalRequest<TData>,
  ): MatDialogRef<TComponent, TResult> {
    return this.modalFactory.openComponent<TComponent, TData, TResult>(request);
  }

  dismissAlerts(toastId?: number): void {
    this.alertFactory.dismiss(toastId);
  }

  closeAllModals(): void {
    this.modalFactory.closeAll();
  }

  dismissAll(): void {
    this.alertFactory.dismiss();
    this.modalFactory.closeAll();
  }
}
