import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import Swal from 'sweetalert2';
import { SweetAlertService } from './sweet-alert.service';

jest.mock('sweetalert2', () => ({
  __esModule: true,
  default: {
    fire: jest.fn(),
    close: jest.fn(),
  },
}));

describe('SweetAlertService', () => {
  let service: SweetAlertService;

  beforeEach(() => {
    document.documentElement.classList.remove('app-dark');
    TestBed.configureTestingModule({
      providers: [
        SweetAlertService,
        provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' }),
      ],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', {
      ui: {
        notificationOkAction: 'OK',
        dialogConfirmAction: 'Confirmar',
        dialogCancelAction: 'Cancelar',
      },
    });
    service = TestBed.inject(SweetAlertService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.documentElement.classList.remove('app-dark');
  });

  it('should fire modal alert with light theme defaults and i18n confirm button', async () => {
    (Swal.fire as jest.Mock).mockResolvedValueOnce({ isConfirmed: true });

    await service.alert('Sucesso', 'Tudo salvo', 'success');

    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        background: '#ffffff',
        color: '#0f172a',
        title: 'Sucesso',
        text: 'Tudo salvo',
        icon: 'success',
        confirmButtonText: 'OK',
        showConfirmButton: true,
      }),
    );
  });

  it('should apply dark theme palette when app-dark class is active and support confirm()', async () => {
    document.documentElement.classList.add('app-dark');
    (Swal.fire as jest.Mock).mockResolvedValueOnce({ isConfirmed: true });

    const confirmed = await service.confirm({
      title: 'Limpar respostas?',
      text: 'Esta ação remove o rascunho local.',
      icon: 'warning',
    });

    expect(confirmed).toBe(true);
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        background: '#161b26',
        color: '#f1f5f9',
        showCancelButton: true,
        confirmButtonText: 'Confirmar',
        cancelButtonText: 'Cancelar',
      }),
    );
  });

  it('should fire top-end toast and close active dialog via close()', async () => {
    (Swal.fire as jest.Mock).mockResolvedValueOnce({ isDismissed: true });

    await service.toast('Rascunho importado', 'success', 'top-end', 3500);
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Rascunho importado',
        timer: 3500,
        showConfirmButton: false,
      }),
    );

    await service.close();
    expect(Swal.close).toHaveBeenCalledTimes(1);
  });
});
