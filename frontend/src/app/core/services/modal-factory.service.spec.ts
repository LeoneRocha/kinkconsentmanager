import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { firstValueFrom, of } from 'rxjs';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ModalFactoryService } from './modal-factory.service';
import { SweetAlertService } from './sweet-alert.service';

@Component({
  selector: 'app-dummy-modal',
  template: '',
})
class DummyModalComponent {}

describe('ModalFactoryService', () => {
  let factory: ModalFactoryService;
  let matDialogMock: { open: jest.Mock; closeAll: jest.Mock };
  let sweetAlertMock: { confirm: jest.Mock; alert: jest.Mock; close: jest.Mock };

  beforeEach(() => {
    matDialogMock = {
      open: jest.fn(),
      closeAll: jest.fn(),
    };
    sweetAlertMock = {
      confirm: jest.fn().mockResolvedValue(true),
      alert: jest.fn().mockResolvedValue({ isConfirmed: true }),
      close: jest.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        ModalFactoryService,
        provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' }),
        { provide: MatDialog, useValue: matDialogMock },
        { provide: SweetAlertService, useValue: sweetAlertMock },
      ],
    });

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', {
      ui: {
        dialogDefaultTitle: 'Confirmação',
        dialogConfirmAction: 'Confirmar',
        dialogCancelAction: 'Cancelar',
        notificationOkAction: 'OK',
      },
    });

    factory = TestBed.inject(ModalFactoryService);
  });

  it('should default to Material MatDialog for confirm() with i18n fallbacks', async () => {
    expect(factory.defaultEngine()).toBe('material');
    matDialogMock.open.mockReturnValueOnce({ afterClosed: () => of(true) });

    const accepted = await firstValueFrom(
      factory.confirm({
        message: 'Remover todos os itens?',
        danger: true,
      }),
    );

    expect(accepted).toBe(true);
    expect(matDialogMock.open).toHaveBeenCalledWith(
      ConfirmDialogComponent,
      expect.objectContaining({
        width: 'min(92vw, 28rem)',
        data: expect.objectContaining({
          header: 'Confirmação',
          message: 'Remover todos os itens?',
          acceptLabel: 'Confirmar',
          rejectLabel: 'Cancelar',
          danger: true,
        }),
      }),
    );
  });

  it('should support sweetalert engine for confirm() and alert()', async () => {
    const restore = factory.setDefaultEngine('sweetalert');

    const confirmed = await firstValueFrom(
      factory.confirm({
        title: 'Resetar?',
        message: 'Confirma limpeza?',
        danger: true,
      }),
    );
    expect(confirmed).toBe(true);
    expect(sweetAlertMock.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Resetar?',
        text: 'Confirma limpeza?',
        icon: 'warning',
        confirmButtonText: 'Confirmar',
        cancelButtonText: 'Cancelar',
      }),
    );

    const acknowledged = await firstValueFrom(
      factory.alert({
        message: 'Operação finalizada.',
      }),
    );
    expect(acknowledged).toBe(true);
    expect(sweetAlertMock.alert).toHaveBeenCalledWith(
      'Confirmação',
      'Operação finalizada.',
      'info',
      'OK',
    );

    restore();
    expect(factory.defaultEngine()).toBe('material');
  });

  it('should open custom dialog components and close all overlays', () => {
    const fakeRef = { close: jest.fn() };
    matDialogMock.open.mockReturnValueOnce(fakeRef);

    const ref = factory.openComponent({
      component: DummyModalComponent,
      config: { width: '32rem' },
    });

    expect(ref).toBe(fakeRef);
    expect(matDialogMock.open).toHaveBeenCalledWith(DummyModalComponent, { width: '32rem' });

    factory.closeAll();
    expect(matDialogMock.closeAll).toHaveBeenCalledTimes(1);
    expect(sweetAlertMock.close).toHaveBeenCalledTimes(1);
  });

  it('should support registering custom modal provider adapters cleanly', async () => {
    const customConfirm = jest.fn().mockReturnValue(of(true));
    const customAlert = jest.fn().mockReturnValue(of(true));
    const customClose = jest.fn();
    factory.registerProvider('custom-modal', {
      confirm: customConfirm,
      alert: customAlert,
      closeAll: customClose,
    });

    const accepted = await firstValueFrom(
      factory.confirm({
        provider: 'custom-modal',
        message: 'Confirmar via adapter?',
      }),
    );
    expect(accepted).toBe(true);
    expect(customConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Confirmar via adapter?',
        title: 'Confirmação',
      }),
    );

    factory.closeAll();
    expect(customClose).toHaveBeenCalledTimes(1);
  });
});
