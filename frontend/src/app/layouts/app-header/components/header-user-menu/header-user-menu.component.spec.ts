import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { AUTH_SESSION_STORAGE_KEY, AuthService } from '../../../../core/services';
import { HeaderUserMenuComponent } from './header-user-menu.component';

describe('HeaderUserMenuComponent', () => {
  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [HeaderUserMenuComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' }),
      ],
    }).compileComponents();

    TestBed.inject(TranslateService).setTranslation('pt-BR', {
      ui: {
        authUserMenuLabel: 'Conta do usuário',
        authLogoutButton: 'Sair da conta',
        authLogoutSuccess: 'Sessão encerrada com sucesso.',
      },
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should stay hidden when user is not authenticated', async () => {
    const fixture = TestBed.createComponent(HeaderUserMenuComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[data-testid="header-user-btn"]')).toBeNull();
  });

  it('should render themed user icon when authenticated and sign out cleanly', async () => {
    localStorage.setItem(
      AUTH_SESSION_STORAGE_KEY,
      JSON.stringify({
        user: {
          id: 7,
          name: 'Carlos Mendes',
          login: 'carlos.m',
          email: 'carlos@exemplo.com',
          isActive: true,
          createdAt: '2026-11-26T00:00:00Z',
        },
        accessToken: 'jwt-access-token',
        refreshToken: 'jwt-refresh-token',
        expiresAtUtc: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    );

    const fixture = TestBed.createComponent(HeaderUserMenuComponent);
    const authService = TestBed.inject(AuthService);
    const httpTesting = TestBed.inject(HttpTestingController);

    let toggled = 0;
    let closedCount = 0;
    fixture.componentInstance.toggleRequested.subscribe(() => toggled++);
    fixture.componentInstance.closed.subscribe(() => closedCount++);

    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const btn = el.querySelector<HTMLButtonElement>('[data-testid="header-user-btn"]');
    expect(btn).not.toBeNull();
    expect(btn?.querySelector('i.fa-user.app-shell__user-icon')).not.toBeNull();

    btn?.click();
    expect(toggled).toBe(1);

    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    await fixture.whenStable();

    const menu = el.querySelector('.app-shell__popover--user-menu');
    expect(menu?.textContent).toContain('Carlos Mendes');
    expect(menu?.textContent).toContain('@carlos.m');
    expect(menu?.textContent).toContain('carlos@exemplo.com');

    el.querySelector<HTMLButtonElement>('[data-testid="header-user-logout"]')?.click();
    expect(closedCount).toBe(1);

    const req = httpTesting.expectOne('/api/v1/auth/logout');
    req.flush({ isSuccess: true, data: true });

    fixture.detectChanges();
    await fixture.whenStable();

    expect(authService.user()).toBeNull();
    expect(el.querySelector('[data-testid="header-user-btn"]')).toBeNull();
    httpTesting.verify();
  });
});
