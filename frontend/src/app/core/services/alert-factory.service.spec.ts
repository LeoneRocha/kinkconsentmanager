import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { AlertFactoryService } from './alert-factory.service';
import { NotificationChannel, NotificationService } from './notification.service';

describe('AlertFactoryService', () => {
  let factory: AlertFactoryService;
  let notificationsMock: {
    success: jest.Mock;
    error: jest.Mock;
    warning: jest.Mock;
    info: jest.Mock;
    dismiss: jest.Mock;
    setDefaultPosition: jest.Mock;
  };

  beforeEach(() => {
    notificationsMock = {
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn(),
      dismiss: jest.fn(),
      setDefaultPosition: jest.fn().mockReturnValue(() => undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        AlertFactoryService,
        provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' }),
        { provide: NotificationService, useValue: notificationsMock },
      ],
    });

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', {
      ui: {
        notificationOkAction: 'OK',
      },
    });

    factory = TestBed.inject(AlertFactoryService);
  });

  it('should default to toast engine and dispatch success with translated default action', () => {
    expect(factory.defaultEngine()).toBe('toast');

    factory.success('Operação concluída', { duration: 4000 });

    expect(notificationsMock.success).toHaveBeenCalledWith(
      'Operação concluída',
      'OK',
      expect.objectContaining({
        channel: NotificationChannel.Toast,
        duration: 4000,
      }),
    );
  });

  it('should map snackbar and sweetalert engines cleanly', () => {
    factory.error('Falha crítica', {
      engine: 'sweetalert',
      actionLabel: 'Fechar',
      duration: 5000,
    });
    expect(notificationsMock.error).toHaveBeenCalledWith(
      'Falha crítica',
      'Fechar',
      expect.objectContaining({
        channel: NotificationChannel.SweetAlert2,
        duration: 5000,
      }),
    );

    const restore = factory.setDefaultEngine('snackbar');
    factory.warning('Aviso importante', {
      position: { vertical: 'top', horizontal: 'left' },
    });
    expect(notificationsMock.warning).toHaveBeenCalledWith(
      'Aviso importante',
      'OK',
      expect.objectContaining({
        channel: NotificationChannel.MatSnackBar,
        verticalPosition: 'top',
        horizontalPosition: 'left',
      }),
    );

    restore();
    expect(factory.defaultEngine()).toBe('toast');
  });

  it('should forward info, dismiss, and setDefaultPosition calls', () => {
    factory.info('Informação rápida');
    expect(notificationsMock.info).toHaveBeenCalledTimes(1);

    factory.dismiss(12);
    expect(notificationsMock.dismiss).toHaveBeenCalledWith(12);

    factory.setDefaultPosition({ vertical: 'bottom', horizontal: 'center' });
    expect(notificationsMock.setDefaultPosition).toHaveBeenCalledWith({
      vertical: 'bottom',
      horizontal: 'center',
    });
  });

  it('should support registering custom alert provider adapters cleanly', () => {
    const customOpen = jest.fn();
    const customDismiss = jest.fn();
    factory.registerProvider('custom-toast', { open: customOpen, dismiss: customDismiss });

    factory.open({
      severity: 'info',
      message: 'Via adaptador plugado',
      provider: 'custom-toast',
    });
    expect(customOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'info',
        message: 'Via adaptador plugado',
        actionLabel: 'OK',
      }),
    );

    factory.dismiss(7);
    expect(customDismiss).toHaveBeenCalledWith(7);
  });
});
