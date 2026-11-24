import { Injectable, inject } from '@angular/core';
import type Swal from 'sweetalert2';
import type {
  SweetAlertIcon,
  SweetAlertOptions,
  SweetAlertPosition,
  SweetAlertResult,
} from 'sweetalert2';
import { I18nService } from './i18n.service';

type SweetAlertApi = typeof Swal;

export interface SweetAlertConfirmOptions {
  readonly title: string;
  readonly text?: string;
  readonly icon?: SweetAlertIcon;
  readonly confirmButtonText?: string;
  readonly cancelButtonText?: string;
}

/**
 * Servico desacoplado e lazy-loaded que encapsula o `sweetalert2`
 * e adapta automaticamente cores ao tema e textos i18n da aplicacao.
 */
@Injectable({ providedIn: 'root' })
export class SweetAlertService {
  private readonly i18n = inject(I18nService);
  private swalPromise: Promise<SweetAlertApi> | null = null;

  async fire<T = unknown>(options: SweetAlertOptions): Promise<SweetAlertResult<T>> {
    const swal = await this.loadSwal();
    return swal.fire({
      ...this.buildThemeDefaults(),
      ...options,
    } as SweetAlertOptions) as Promise<SweetAlertResult<T>>;
  }

  async alert(
    title: string,
    text: string,
    icon: SweetAlertIcon = 'info',
    confirmButtonText?: string,
  ): Promise<SweetAlertResult<unknown>> {
    return this.fire({
      title,
      text,
      icon,
      confirmButtonText: confirmButtonText ?? this.i18n.translateUi('notificationOkAction'),
      showConfirmButton: true,
    });
  }

  async confirm(options: SweetAlertConfirmOptions): Promise<boolean> {
    const result = await this.fire({
      title: options.title,
      text: options.text,
      icon: options.icon ?? 'question',
      showCancelButton: true,
      confirmButtonText:
        options.confirmButtonText ?? this.i18n.translateUi('dialogConfirmAction'),
      cancelButtonText: options.cancelButtonText ?? this.i18n.translateUi('dialogCancelAction'),
      reverseButtons: true,
    });
    return Boolean(result.isConfirmed);
  }

  async toast(
    message: string,
    icon: SweetAlertIcon = 'info',
    position: SweetAlertPosition = 'top-end',
    timer = 4000,
  ): Promise<SweetAlertResult<unknown>> {
    return this.fire({
      toast: true,
      position,
      icon,
      title: message,
      showConfirmButton: false,
      timer,
      timerProgressBar: timer > 0,
    });
  }

  async close(): Promise<void> {
    const Swal = await this.loadSwal();
    Swal.close();
  }

  private loadSwal(): Promise<SweetAlertApi> {
    this.swalPromise ??= import('sweetalert2').then((module) => module.default);
    return this.swalPromise;
  }

  private buildThemeDefaults(): SweetAlertOptions {
    const isDark =
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('app-dark');

    return isDark
      ? {
          background: '#161b26',
          color: '#f1f5f9',
          confirmButtonColor: '#2563eb',
          cancelButtonColor: '#475569',
        }
      : {
          background: '#ffffff',
          color: '#0f172a',
          confirmButtonColor: '#2563eb',
          cancelButtonColor: '#64748b',
        };
  }
}
