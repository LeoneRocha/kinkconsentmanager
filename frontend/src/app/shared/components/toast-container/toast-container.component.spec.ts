import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../../core/services';
import { AppToastContainerComponent } from './toast-container.component';

describe('AppToastContainerComponent', () => {
  let notifications: NotificationService;

  beforeEach(async () => {
    jest.useFakeTimers();

    await TestBed.configureTestingModule({
      imports: [AppToastContainerComponent],
      providers: [provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' })],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', {
      ui: {
        notificationsRegionLabel: 'Notificações',
        notificationCloseLabel: 'Fechar notificação',
        notificationOkAction: 'OK',
      },
    });

    notifications = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    notifications.dismiss();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should stay empty when no toasts exist and render i18n top-center toast with timer bar on success()', async () => {
    const fixture = TestBed.createComponent(AppToastContainerComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.kcm-toast-container')).toBeNull();

    notifications.success('Rascunho importado com sucesso.', 'OK');
    fixture.detectChanges();
    await fixture.whenStable();

    const container = (fixture.nativeElement as HTMLElement).querySelector('.kcm-toast-container');
    expect(container?.classList.contains('kcm-toast-container--top-center')).toBe(true);
    expect(container?.getAttribute('aria-label')).toBe('Notificações');

    const toast = container?.querySelector('.kcm-toast--success');
    expect(toast).not.toBeNull();
    expect(toast?.getAttribute('role')).toBe('status');
    expect(toast?.textContent).toContain('Rascunho importado com sucesso.');
    expect(container?.querySelector('.kcm-toast__close-btn')?.getAttribute('aria-label')).toBe(
      'Fechar notificação',
    );

    const timerBar = toast?.querySelector<HTMLElement>('.kcm-toast__timer');
    expect(timerBar).not.toBeNull();
    expect(timerBar?.style.animationDuration).toBe('4000ms');
  });

  it('should allow overriding position, omit timer when duration is 0, and dismiss errors via close button', async () => {
    const fixture = TestBed.createComponent(AppToastContainerComponent);
    fixture.componentRef.setInput('position', { vertical: 'bottom', horizontal: 'left' });
    notifications.error('Arquivo inválido.', 'OK', { duration: 0 });
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const container = el.querySelector('.kcm-toast-container');
    expect(container?.classList.contains('kcm-toast-container--bottom-left')).toBe(true);
    expect(el.querySelector('.kcm-toast--error')?.getAttribute('role')).toBe('alert');
    expect(el.querySelector('.kcm-toast__timer')).toBeNull();

    el.querySelector<HTMLButtonElement>('.kcm-toast__close-btn')?.click();
    fixture.detectChanges();
    expect(el.querySelector('.kcm-toast-container')).toBeNull();
  });
});
