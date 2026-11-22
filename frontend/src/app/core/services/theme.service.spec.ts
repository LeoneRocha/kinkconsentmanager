import { TestBed } from '@angular/core/testing';
import { PREF_THEME_KEY } from '../repositories/user-preferences.repository';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

describe('ThemeService', () => {
  const originalMatchMedia = globalThis.matchMedia;

  const clearDomState = (): void => {
    localStorage.clear();
    document.documentElement.classList.remove('app-dark');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
  };

  beforeEach(() => {
    clearDomState();
  });

  afterEach(() => {
    clearDomState();
    globalThis.matchMedia = originalMatchMedia;
    jest.restoreAllMocks();
  });

  // Cenário: Inicialização sem preferência salva e sistema em modo claro.
  // Objetivo: Garantir que o tema inicial padrão seja 'light' com atributos DOM consistentes.
  it('should default to light theme when no stored preference or OS dark preference exists', () => {
    globalThis.matchMedia = jest.fn().mockReturnValue({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }) as unknown as typeof globalThis.matchMedia;

    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('light');
    expect(service.isDark()).toBe(false);
    expect(document.documentElement.classList.contains('app-dark')).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  // Cenário: Sistema operacional configurado em modo escuro e atualização dinâmica via listener.
  // Objetivo: Seguir a preferência do sistema ao vivo e permitir limpar escolha manual.
  it('should follow OS dark preference and react to live matchMedia changes when no explicit choice is saved', () => {
    let changeHandler: ((event?: { matches: boolean }) => void) | undefined;
    const mediaMock = {
      matches: false,
      media: '(prefers-color-scheme: dark)',
      addEventListener: jest.fn((_event: string, handler: (event?: { matches: boolean }) => void) => {
        changeHandler = handler;
      }),
      removeEventListener: jest.fn(),
    };
    globalThis.matchMedia = jest.fn().mockReturnValue(mediaMock) as unknown as typeof globalThis.matchMedia;

    const service = TestBed.inject(ThemeService);
    expect(service.isDark()).toBe(false);

    mediaMock.matches = true;
    changeHandler?.({ matches: true });
    expect(service.isDark()).toBe(true);
    expect(service.theme()).toBe('dark');

    service.setTheme('light');
    expect(service.isDark()).toBe(false);
    expect(localStorage.getItem(PREF_THEME_KEY)).toBe(JSON.stringify('light'));

    service.clearSavedTheme();
    expect(localStorage.getItem(PREF_THEME_KEY)).toBeNull();
    expect(service.isDark()).toBe(true);
  });

  // Cenário: Preferência prévia persistida no navegador via UserPreferencesRepository.
  // Objetivo: Priorizar a escolha salva (inclusive valor legado bruto ou JSON) sobre a preferência do SO.
  it('should restore persisted theme preference from UserPreferencesRepository on startup', () => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify('dark'));

    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('dark');
    expect(service.isDark()).toBe(true);
    expect(document.documentElement.classList.contains('app-dark')).toBe(true);
  });

  // Cenário: Alternância manual entre tema claro e escuro pelo usuário.
  // Objetivo: Atualizar signals, classes CSS na raiz do documento e persistência no navegador.
  it('should toggle theme, update root DOM classes, and persist choice', () => {
    const service = TestBed.inject(ThemeService);

    const toggled = service.toggleTheme();
    expect(toggled).toBe('dark');
    expect(service.isDark()).toBe(true);
    expect(document.documentElement.classList.contains('app-dark')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(JSON.stringify('dark'));

    service.setTheme('light');
    expect(service.theme()).toBe('light');
    expect(service.isDark()).toBe(false);
    expect(document.documentElement.classList.contains('app-dark')).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(JSON.stringify('light'));
  });
});
