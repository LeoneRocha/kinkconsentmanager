import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { FeedbackProvider, UiFeedbackHostService } from '../../../core/services';
import { AppPopupHostComponent, PopupKind } from './popup-host.component';

@Component({
  imports: [AppPopupHostComponent],
  template: `
    <app-popup-host
      [kind]="kind"
      [provider]="provider"
      severity="success"
      title="Confirmação"
      message="Operação centralizada"
      (opened)="onOpened()"
      (confirmed)="onConfirmed()"
      (dismissed)="onDismissed()"
      (closed)="onClosed()"
    >
      <span popupTrigger class="trigger-text">Acionar</span>
      <div class="popover-body">Corpo do popover</div>
    </app-popup-host>
  `,
})
class PopupHostHarnessComponent {
  kind: PopupKind = 'popover';
  provider?: FeedbackProvider;
  onOpened = jest.fn();
  onConfirmed = jest.fn();
  onDismissed = jest.fn();
  onClosed = jest.fn();
}

describe('AppPopupHostComponent', () => {
  let feedbackHostMock: { open: jest.Mock };

  beforeEach(async () => {
    feedbackHostMock = {
      open: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PopupHostHarnessComponent],
      providers: [
        provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' }),
        { provide: UiFeedbackHostService, useValue: feedbackHostMock },
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', {
      ui: {
        popoverDefaultLabel: 'Painel contextual',
      },
    });
  });

  it('should render AppPopperPopoverComponent when kind is popover', async () => {
    const fixture = TestBed.createComponent(PopupHostHarnessComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelector('app-popper-popover')).not.toBeNull();
    expect(hostEl.querySelector('.popover-body')?.textContent).toContain('Corpo do popover');
  });

  it('should dispatch to UiFeedbackHostService with explicit provider when kind is alert', async () => {
    const fixture = TestBed.createComponent(PopupHostHarnessComponent);
    fixture.componentInstance.kind = 'alert';
    fixture.componentInstance.provider = 'snackbar';
    fixture.detectChanges();
    await fixture.whenStable();

    const btn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.kcm-popup-host__trigger',
    )!;
    btn.click();

    expect(feedbackHostMock.open).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'alert',
        provider: 'snackbar',
        severity: 'success',
        message: 'Operação centralizada',
      }),
    );
    expect(fixture.componentInstance.onOpened).toHaveBeenCalledTimes(1);
  });

  it('should dispatch to UiFeedbackHostService with explicit provider when kind is modal and emit confirmed/dismissed', async () => {
    const fixture = TestBed.createComponent(PopupHostHarnessComponent);
    fixture.componentInstance.kind = 'modal';
    fixture.componentInstance.provider = 'sweetalert';
    fixture.detectChanges();
    await fixture.whenStable();

    const btn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.kcm-popup-host__trigger',
    )!;

    feedbackHostMock.open.mockReturnValueOnce(of(true));
    btn.click();
    expect(feedbackHostMock.open).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'modal',
        modalType: 'confirm',
        provider: 'sweetalert',
      }),
    );
    expect(fixture.componentInstance.onConfirmed).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.onClosed).toHaveBeenCalledTimes(1);

    feedbackHostMock.open.mockReturnValueOnce(of(false));
    btn.click();
    expect(fixture.componentInstance.onDismissed).toHaveBeenCalledTimes(1);
  });
});
