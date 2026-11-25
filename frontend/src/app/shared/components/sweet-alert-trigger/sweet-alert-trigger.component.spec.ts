import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { SweetAlertService } from '../../../core/services';
import { AppSweetAlertTriggerComponent } from './sweet-alert-trigger.component';

@Component({
  imports: [AppSweetAlertTriggerComponent],
  template: `
    <app-sweet-alert-trigger
      mode="confirm"
      text="Deseja prosseguir?"
      icon="warning"
      (confirmed)="onConfirmed()"
      (dismissed)="onDismissed()"
    >
      Executar
    </app-sweet-alert-trigger>
  `,
})
class SweetAlertHostComponent {
  onConfirmed = jest.fn();
  onDismissed = jest.fn();
}

describe('AppSweetAlertTriggerComponent', () => {
  let sweetAlertMock: {
    confirm: jest.Mock;
    alert: jest.Mock;
    toast: jest.Mock;
  };

  beforeEach(async () => {
    sweetAlertMock = {
      confirm: jest.fn(),
      alert: jest.fn(),
      toast: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SweetAlertHostComponent],
      providers: [
        provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' }),
        { provide: SweetAlertService, useValue: sweetAlertMock },
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', {
      ui: {
        dialogDefaultTitle: 'Confirmação',
        dialogConfirmAction: 'Confirmar',
        dialogCancelAction: 'Cancelar',
      },
    });
  });

  it('should invoke SweetAlertService.confirm with i18n defaults and emit confirmed or dismissed', async () => {
    const fixture = TestBed.createComponent(SweetAlertHostComponent);
    const hostComponent = fixture.componentInstance;
    fixture.detectChanges();

    const btn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button.kcm-swal-trigger',
    )!;

    sweetAlertMock.confirm.mockResolvedValueOnce(true);
    btn.click();
    await fixture.whenStable();
    expect(sweetAlertMock.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Confirmação',
        text: 'Deseja prosseguir?',
        confirmButtonText: 'Confirmar',
        cancelButtonText: 'Cancelar',
      }),
    );
    expect(hostComponent.onConfirmed).toHaveBeenCalledTimes(1);

    sweetAlertMock.confirm.mockResolvedValueOnce(false);
    btn.click();
    await fixture.whenStable();
    expect(hostComponent.onDismissed).toHaveBeenCalledTimes(1);
  });

  it('should support alert and toast modes directly', async () => {
    const fixture = TestBed.createComponent(AppSweetAlertTriggerComponent);
    fixture.componentRef.setInput('mode', 'toast');
    fixture.componentRef.setInput('text', 'Salvo');
    fixture.componentRef.setInput('icon', 'success');
    sweetAlertMock.toast.mockResolvedValueOnce({ isDismissed: true });

    await fixture.componentInstance.open();
    expect(sweetAlertMock.toast).toHaveBeenCalledWith('Salvo', 'success', 'top-end', 4000);

    fixture.componentRef.setInput('mode', 'alert');
    fixture.componentRef.setInput('title', 'Informação');
    sweetAlertMock.alert.mockResolvedValueOnce({ isConfirmed: true });
    await fixture.componentInstance.open();
    expect(sweetAlertMock.alert).toHaveBeenCalledWith(
      'Informação',
      'Salvo',
      'success',
      'Confirmar',
    );
  });
});
