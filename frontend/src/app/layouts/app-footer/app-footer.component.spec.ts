import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import { AppFooterComponent } from './app-footer.component';

describe('AppFooterComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppFooterComponent],
      providers: [provideTranslateService({ lang: 'pt-BR', fallbackLang: 'en-US' })],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', {
      ui: {
        privacyNotice: 'Privacidade local: seus dados permanecem exclusivamente no seu navegador.',
        footerCopyright: 'Todos os direitos reservados.',
        footerVersionLabel: 'Versão',
        footerBuildLabel: 'build',
      },
    });
  });

  it('should render privacy notice, copyright, and dynamic environment version + buildDate by default', async () => {
    const fixture = TestBed.createComponent(AppFooterComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const footer = (fixture.nativeElement as HTMLElement).querySelector(
      'footer.app-shell__footer[role="contentinfo"]',
    );
    expect(footer).not.toBeNull();
    expect(footer?.textContent).toContain('Privacidade local');
    expect(footer?.textContent).toContain(String(new Date().getFullYear()));
    expect(footer?.textContent).toContain(environment.appName);
    expect(footer?.textContent).toContain('Todos os direitos reservados.');
    expect(footer?.textContent).toContain(
      `Versão ${environment.version} (build ${environment.buildDate})`,
    );
  });

  it('should allow custom inputs for appName, appVersion, buildDate, and currentYear', async () => {
    const fixture = TestBed.createComponent(AppFooterComponent);
    fixture.componentRef.setInput('appName', 'CustomApp');
    fixture.componentRef.setInput('appVersion', '2.0.1');
    fixture.componentRef.setInput('buildDate', '2026.11.20');
    fixture.componentRef.setInput('currentYear', 2030);
    fixture.detectChanges();
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('2030 CustomApp');
    expect(text).toContain('Versão 2.0.1 (build 2026.11.20)');
  });
});
