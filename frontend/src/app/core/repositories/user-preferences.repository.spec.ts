import { TestBed } from '@angular/core/testing';
import {
  PREF_ACCESSIBILITY_KEY,
  PREF_LANGUAGE_KEY,
  PREF_THEME_KEY,
  USER_PREFERENCES_REPOSITORY_TOKEN,
  UserPreferencesRepository,
} from './user-preferences.repository';

describe('UserPreferencesRepository', () => {
  let repository: UserPreferencesRepository;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    repository = TestBed.inject(UserPreferencesRepository);
  });

  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  // Cenário: Gravação e leitura de tema, idioma e acessibilidade no repositório.
  // Objetivo: Garantir persistência sob as chaves oficiais e retorno consistente em getSnapshot().
  it('should persist, read, snapshot, and clear theme, language, and accessibility preferences', () => {
    const tokenInstance = TestBed.inject(USER_PREFERENCES_REPOSITORY_TOKEN);
    expect(tokenInstance).toBeTruthy();

    expect(repository.saveTheme('dark')).toBe(true);
    expect(repository.saveLanguage('en-US')).toBe(true);
    expect(
      repository.saveAccessibility({
        audioAssistEnabled: true,
        visualCaptionsEnabled: true,
        speechRate: 1.2,
        highContrast: true,
        fontScale: 'large',
        reducedMotion: false,
      }),
    ).toBe(true);

    expect(repository.getTheme()).toBe('dark');
    expect(repository.getLanguage()).toBe('en-US');
    expect(repository.getAccessibility()).toEqual({
      audioAssistEnabled: true,
      visualCaptionsEnabled: true,
      speechRate: 1.2,
      highContrast: true,
      fontScale: 'large',
      reducedMotion: false,
    });

    expect(repository.getSnapshot()).toEqual({
      theme: 'dark',
      language: 'en-US',
      accessibility: {
        audioAssistEnabled: true,
        visualCaptionsEnabled: true,
        speechRate: 1.2,
        highContrast: true,
        fontScale: 'large',
        reducedMotion: false,
      },
    });

    repository.clearAll();
    expect(repository.getSnapshot()).toEqual({
      theme: null,
      language: null,
      accessibility: null,
    });
  });

  // Cenário: Dados corrompidos ou inválidos previamente gravados no localStorage do navegador.
  // Objetivo: Rejeitar tema/idioma inválidos retornando null e sanitizar campos inválidos em acessibilidade.
  it('should validate corrupted stored preferences and support custom extension keys', () => {
    localStorage.setItem(PREF_THEME_KEY, 'neon');
    localStorage.setItem(PREF_LANGUAGE_KEY, 'fr-FR');
    localStorage.setItem(
      PREF_ACCESSIBILITY_KEY,
      JSON.stringify({
        audioAssistEnabled: 'yes',
        speechRate: 99,
        fontScale: 'huge',
        highContrast: true,
      }),
    );

    expect(repository.getTheme()).toBeNull();
    expect(repository.getLanguage()).toBeNull();
    expect(repository.getAccessibility()).toEqual({
      audioAssistEnabled: false,
      visualCaptionsEnabled: false,
      speechRate: 1,
      highContrast: true,
      fontScale: 'normal',
      reducedMotion: false,
    });

    expect(repository.savePreference('kcm_custom_view', { compact: true })).toBe(true);
    expect(repository.getPreference<{ compact: boolean }>('kcm_custom_view')).toEqual({
      compact: true,
    });
    repository.removePreference('kcm_custom_view');
    expect(repository.getPreference('kcm_custom_view')).toBeNull();
  });
});
