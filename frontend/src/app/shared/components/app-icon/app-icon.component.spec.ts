import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { AppIconComponent } from './app-icon.component';

@Component({
  imports: [AppIconComponent],
  template: `
    <app-icon class="solid-icon" [icon]="solidIcon" size="lg" [fixedWidth]="true" />
    <app-icon class="brand-icon" [icon]="brandIcon" ariaLabel="GitHub" />
    <app-icon class="titled-icon" [icon]="solidIcon" title="Proteção Local" />
    <app-icon class="css-icon" icon="fa-solid fa-lock" size="sm" [spin]="true" title="Bloqueado" />
  `,
})
class IconHostComponent {
  readonly solidIcon = faShieldHalved;
  readonly brandIcon = faGithub;
}

describe('AppIconComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IconHostComponent],
    }).compileComponents();
  });

  it('should render solid and brand SVG IconDefinitions with correct attributes and accessibility', async () => {
    const fixture = TestBed.createComponent(IconHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const solidSvg = host.querySelector('.solid-icon svg')!;
    expect(solidSvg).not.toBeNull();
    expect(solidSvg.getAttribute('data-icon')).toBe('shield-halved');
    expect(solidSvg.getAttribute('data-prefix')).toBe('fas');
    expect(solidSvg.getAttribute('aria-hidden')).toBe('true');
    expect(solidSvg.classList.contains('kcm-icon--lg')).toBe(true);
    expect(solidSvg.classList.contains('kcm-icon--fw')).toBe(true);
    expect(solidSvg.querySelectorAll('path').length).toBeGreaterThan(0);

    const brandSvg = host.querySelector('.brand-icon svg')!;
    expect(brandSvg).not.toBeNull();
    expect(brandSvg.getAttribute('data-icon')).toBe('github');
    expect(brandSvg.getAttribute('data-prefix')).toBe('fab');
    expect(brandSvg.getAttribute('role')).toBe('img');
    expect(brandSvg.getAttribute('aria-label')).toBe('GitHub');
    expect(brandSvg.getAttribute('title')).toBe('GitHub');
    expect(brandSvg.getAttribute('aria-hidden')).toBeNull();
    expect(brandSvg.querySelector('title')?.textContent).toBe('GitHub');

    const titledSvg = host.querySelector('.titled-icon svg')!;
    expect(titledSvg.getAttribute('title')).toBe('Proteção Local');
    expect(titledSvg.getAttribute('aria-label')).toBe('Proteção Local');
    expect(titledSvg.getAttribute('role')).toBe('img');
    expect(titledSvg.querySelector('title')?.textContent).toBe('Proteção Local');
  });

  // Cenário: Renderização de ícone com classes CSS e título acessível.
  // Objetivo: Garantir que o elemento <i> receba classes Font Awesome e atributo title/aria-label.
  it('should render fallback Font Awesome CSS class icons with accessible title when string is passed', async () => {
    const fixture = TestBed.createComponent(IconHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const cssEl = (fixture.nativeElement as HTMLElement).querySelector('.css-icon i')!;
    expect(cssEl).not.toBeNull();
    expect(cssEl.classList.contains('fa-solid')).toBe(true);
    expect(cssEl.classList.contains('fa-lock')).toBe(true);
    expect(cssEl.classList.contains('kcm-icon--sm')).toBe(true);
    expect(cssEl.classList.contains('fa-spin')).toBe(true);
    expect(cssEl.getAttribute('title')).toBe('Bloqueado');
    expect(cssEl.getAttribute('aria-label')).toBe('Bloqueado');
    expect(cssEl.getAttribute('role')).toBe('img');
  });
});
