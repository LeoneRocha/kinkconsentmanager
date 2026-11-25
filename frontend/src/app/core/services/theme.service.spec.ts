import { TestBed } from '@angular/core/testing';
import { PREF_THEME_KEY } from '../repositories/user-preferences.repository';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

describe('ThemeService', () => {
  const originalMatchMedia = globalThis.matchMedia;

  const clearDomState = (): void => {
    localStorage.clear();
    document.documentElement.classList.remove('app-dark', 'app-theme-sober');
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

  // Cenário: Inicialização sem preferência salva com dispositivo/navegador em modo escuro.
  // Objetivo: Auto-detectar prefers-color-scheme: dark como padrão inicial e sinalizar isSystemDefault().
  it('should default to dark theme on startup when device/browser prefers dark color scheme and no choice is saved', () => {
    globalThis.matchMedia = jest.fn().mockReturnValue({
      matches: true,
      media: '(prefers-color-scheme: dark)',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }) as unknown as typeof globalThis.matchMedia;

    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('dark');
    expect(service.isDark()).toBe(true);
    expect(service.isSystemDefault()).toBe(true);
    expect(document.documentElement.classList.contains('app-dark')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  // Cenário: Sistema operacional configurado em modo escuro e atualização dinâmica via listener (moderno e legado).
  // Objetivo: Seguir a preferência do sistema ao vivo e permitir limpar escolha manual.
  it('should follow OS dark preference and react to live matchMedia changes when no explicit choice is saved', () => {
    let changeHandler: ((event?: { matches: boolean }) => void) | undefined;
    const mediaMock = {
      matches: false,
      media: '(prefers-color-scheme: dark)',
      addEventListener: jest.fn(
        (_event: string, handler: (event?: { matches: boolean }) => void) => {
          changeHandler = handler;
        },
      ),
      removeEventListener: jest.fn(),
    };
    globalThis.matchMedia = jest
      .fn()
      .mockReturnValue(mediaMock) as unknown as typeof globalThis.matchMedia;

    const service = TestBed.inject(ThemeService);
    expect(service.isDark()).toBe(false);
    expect(service.isSystemDefault()).toBe(true);

    mediaMock.matches = true;
    changeHandler?.({ matches: true });
    expect(service.isDark()).toBe(true);
    expect(service.theme()).toBe('dark');

    service.setTheme('light');
    expect(service.isSystemDefault()).toBe(false);
    expect(service.isDark()).toBe(false);
    expect(localStorage.getItem(PREF_THEME_KEY)).toBe(JSON.stringify('light'));

    service.clearSavedTheme();
    expect(service.isSystemDefault()).toBe(true);
    expect(localStorage.getItem(PREF_THEME_KEY)).toBeNull();
    expect(service.isDark()).toBe(true);
  });

  // Cenário: Navegador legado utilizando MediaQueryList.addListener/removeListener sem addEventListener.
  // Objetivo: Garantir que alterações do tema do dispositivo também sejam detectadas em Safari/WebViews antigos.
  it('should fallback to legacy MediaQueryList.addListener when addEventListener is unavailable', () => {
    let legacyHandler: ((event?: MediaQueryListEvent) => void) | undefined;
    const legacyMediaMock = {
      matches: false,
      media: '(prefers-color-scheme: dark)',
      addListener: jest.fn((handler: (event?: MediaQueryListEvent) => void) => {
        legacyHandler = handler;
      }),
      removeListener: jest.fn(),
    };
    globalThis.matchMedia = jest
      .fn()
      .mockReturnValue(legacyMediaMock) as unknown as typeof globalThis.matchMedia;

    const service = TestBed.inject(ThemeService);
    expect(legacyMediaMock.addListener).toHaveBeenCalledTimes(1);
    expect(service.theme()).toBe('light');

    legacyHandler?.({ matches: true } as MediaQueryListEvent);
    expect(service.theme()).toBe('dark');
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

  // Cenário: Seleção do tema sóbrio (Preto & Branco com azul e degradê) e sobrescrita futura de tokens de cor.
  // Objetivo: Expor os 3 presets fixos, aplicar data-theme='sober' com app-theme-sober, e permitir customização/limpeza de tokens via CSS vars.
  it('should support sober preset and custom color token overrides for future customization', () => {
    const service = TestBed.inject(ThemeService);

    expect(service.presets.map((p) => p.id)).toEqual(['sober', 'light', 'dark']);

    service.setTheme('sober');
    expect(service.theme()).toBe('sober');
    expect(service.isSober()).toBe(true);
    expect(service.isDark()).toBe(false);
    expect(document.documentElement.classList.contains('app-theme-sober')).toBe(true);
    expect(document.documentElement.classList.contains('app-dark')).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('sober');
    expect(document.documentElement.style.colorScheme).toBe('light');

    service.setCustomColorTokens({
      accentPrimary: '#0369a1',
      accentGradient: 'linear-gradient(135deg, #000000 0%, #0369a1 100%)',
    });
    expect(document.documentElement.style.getPropertyValue('--kcm-accent-primary')).toBe('#0369a1');
    expect(document.documentElement.style.getPropertyValue('--kcm-accent-gradient')).toBe(
      'linear-gradient(135deg, #000000 0%, #0369a1 100%)',
    );

    service.clearCustomColorTokens();
    expect(document.documentElement.style.getPropertyValue('--kcm-accent-primary')).toBe('');
    expect(service.customTokenOverrides()).toEqual({});
  });
});
