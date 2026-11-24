import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { NotificationChannel, NotificationService } from './notification.service';
import { SweetAlertService } from './sweet-alert.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let snackBarMock: { open: jest.Mock; dismiss: jest.Mock };
  let sweetAlertMock: { fire: jest.Mock; close: jest.Mock };

  beforeEach(() => {
    jest.useFakeTimers();
    snackBarMock = {
      open: jest.fn(),
      dismiss: jest.fn(),
    };
    sweetAlertMock = {
      fire: jest.fn().mockResolvedValue({ isConfirmed: true }),
      close: jest.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' }),
        { provide: MatSnackBar, useValue: snackBarMock },
        { provide: SweetAlertService, useValue: sweetAlertMock },
      ],
    });

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', {
      ui: {
        notificationOkAction: 'OK',
        notificationTitleSuccess: 'Sucesso',
        notificationTitleError: 'Erro',
        notificationTitleWarning: 'Atenção',
        notificationTitleInfo: 'Informação',
      },
    });

    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    service.dismiss();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should default to Toast channel at top-center position', () => {
    expect(service.defaultChannel()).toBe(NotificationChannel.Toast);
    expect(service.defaultPosition()).toEqual({ vertical: 'top', horizontal: 'center' });

    service.success('Rascunho importado', 'OK');

    expect(service.toasts()).toHaveLength(1);
    expect(service.toasts()[0]).toMatchObject({
      message: 'Rascunho importado',
      actionLabel: 'OK',
      type: 'success',
      position: { vertical: 'top', horizontal: 'center' },
      duration: 4000,
    });
    expect(snackBarMock.open).not.toHaveBeenCalled();
  });

  it('should auto-dismiss toasts after duration and support manual action callback', () => {
    const onAction = jest.fn();
    service.info('Exportação concluída', 'Abrir', { duration: 3000, onAction });

    expect(service.toasts()).toHaveLength(1);
    const id = service.toasts()[0].id;

    service.triggerAction(id);
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(service.toasts()).toHaveLength(0);

    service.error('Falha de leitura', 'OK');
    expect(service.toasts()).toHaveLength(1);
    jest.advanceTimersByTime(5000);
    expect(service.toasts()).toHaveLength(0);
  });

  it('should delegate to MatSnackBar at top-center when channel is MatSnackBar', () => {
    service.open(
      'Aviso via SnackBar',
      'Fechar',
      { duration: 2500 },
      NotificationChannel.MatSnackBar,
    );

    expect(snackBarMock.open).toHaveBeenCalledWith(
      'Aviso via SnackBar',
      'Fechar',
      expect.objectContaining({
        duration: 2500,
        verticalPosition: 'top',
        horizontalPosition: 'center',
        channel: NotificationChannel.MatSnackBar,
      }),
    );
  });

  it('should delegate to SweetAlertService with translated title when channel is SweetAlert2', () => {
    const restore = service.setChannel(NotificationChannel.SweetAlert2);
    service.warning('Atenção ao limite', 'Entendi', { duration: 4500 });

    expect(sweetAlertMock.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: 'warning',
        title: 'Atenção',
        text: 'Atenção ao limite',
        confirmButtonText: 'Entendi',
        showConfirmButton: true,
        timer: 4500,
      }),
    );

    restore();
    expect(service.defaultChannel()).toBe(NotificationChannel.Toast);
  });
});
