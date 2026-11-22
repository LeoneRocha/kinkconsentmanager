import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let closeMock: jest.Mock<void, [boolean?]>;

  const createDialog = async (data: ConfirmDialogData): Promise<void> => {
    closeMock = jest.fn<void, [boolean?]>();

    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close: closeMock } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    await fixture.whenStable();
  };

  afterEach(() => {
    TestBed.resetTestingModule();
    jest.restoreAllMocks();
  });

  // Cenário: Renderização de título, mensagem e ações de aceitação/rejeição no diálogo Material.
  // Objetivo: Fechar com false no cancelamento e true na confirmação.
  it('should display confirmation copy and close with false on reject or true on accept', async () => {
    await createDialog({
      header: 'Limpar tudo?',
      message: 'Esta ação apaga suas marcações.',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Sim',
      rejectLabel: 'Não',
      danger: true,
    });

    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelector('.confirm-dialog__title')?.textContent).toContain('Limpar tudo?');
    expect(hostEl.querySelector('.confirm-dialog__message')?.textContent).toContain(
      'Esta ação apaga suas marcações.',
    );
    expect(hostEl.querySelector('.fa-triangle-exclamation')).not.toBeNull();

    hostEl.querySelector<HTMLButtonElement>('.confirm-dialog__reject-btn')?.click();
    expect(closeMock).toHaveBeenCalledWith(false);

    hostEl.querySelector<HTMLButtonElement>('.confirm-dialog__accept-btn')?.click();
    expect(closeMock).toHaveBeenCalledWith(true);
  });
});
