import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AlertFactoryService } from './alert-factory.service';
import { ModalFactoryService } from './modal-factory.service';
import { UiFeedbackHostService } from './ui-feedback-host.service';

describe('UiFeedbackHostService', () => {
  let host: UiFeedbackHostService;
  let alertFactoryMock: {
    open: jest.Mock;
    success: jest.Mock;
    error: jest.Mock;
    warning: jest.Mock;
    info: jest.Mock;
    dismiss: jest.Mock;
  };
  let modalFactoryMock: {
    confirm: jest.Mock;
    alert: jest.Mock;
    openComponent: jest.Mock;
    closeAll: jest.Mock;
  };

  beforeEach(() => {
    alertFactoryMock = {
      open: jest.fn(),
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn(),
      dismiss: jest.fn(),
    };
    modalFactoryMock = {
      confirm: jest.fn().mockReturnValue(of(true)),
      alert: jest.fn().mockReturnValue(of(true)),
      openComponent: jest.fn(),
      closeAll: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        UiFeedbackHostService,
        { provide: AlertFactoryService, useValue: alertFactoryMock },
        { provide: ModalFactoryService, useValue: modalFactoryMock },
      ],
    });

    host = TestBed.inject(UiFeedbackHostService);
  });

  it('should route kind="alert" with custom provider to AlertFactoryService', () => {
    host.open({
      kind: 'alert',
      provider: 'sweetalert',
      severity: 'success',
      message: 'Salvo via host',
    });

    expect(alertFactoryMock.open).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'sweetalert',
        severity: 'success',
        message: 'Salvo via host',
      }),
    );

    host.error('Erro rápido', { provider: 'toast' });
    expect(alertFactoryMock.error).toHaveBeenCalledWith('Erro rápido', { provider: 'toast' });
  });

  it('should route kind="modal" confirm and alert requests with provider to ModalFactoryService', () => {
    host.open({
      kind: 'modal',
      modalType: 'confirm',
      provider: 'material',
      message: 'Deseja limpar?',
      danger: true,
    });
    expect(modalFactoryMock.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'material',
        message: 'Deseja limpar?',
        danger: true,
      }),
    );

    host.modalAlert({
      provider: 'sweetalert',
      title: 'Detalhes',
      message: 'Descrição da prática',
    });
    expect(modalFactoryMock.alert).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'sweetalert',
        title: 'Detalhes',
        message: 'Descrição da prática',
      }),
    );

    host.dismissAll();
    expect(alertFactoryMock.dismiss).toHaveBeenCalledTimes(1);
    expect(modalFactoryMock.closeAll).toHaveBeenCalledTimes(1);
  });
});
