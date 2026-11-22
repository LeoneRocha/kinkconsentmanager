import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { App } from './app.component';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' }),
        ConfirmationService,
        MessageService,
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', {
      ui: {
        title: 'KinkConsentManager',
        navChecklist: 'Checklist',
        navExport: 'Exportar',
        privacyNotice: 'Privacidade local: seus dados permanecem exclusivamente no seu navegador.',
      },
    });
  });

  it('should create the app shell', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render navigation links for checklist and export routes', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const links = Array.from(el.querySelectorAll('nav a')).map((a) => a.getAttribute('href'));
    expect(links).toContain('/checklist');
    expect(links).toContain('/export');
  });

  it('should include router-outlet, p-toast, p-confirmdialog, and privacy notice', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('router-outlet')).not.toBeNull();
    expect(el.querySelector('p-toast')).not.toBeNull();
    expect(el.querySelector('p-confirmdialog')).not.toBeNull();
    expect(el.textContent).toContain('Privacidade local');
  });

  it('should configure lazy routes for checklist and export with fallback redirect', () => {
    expect(routes.map((route) => route.path)).toEqual(['', 'checklist', 'export', '**']);
    expect(routes[0]?.redirectTo).toBe('checklist');
    expect(routes[3]?.redirectTo).toBe('checklist');
  });
});
