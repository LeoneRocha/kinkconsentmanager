import { ThemeColorTokens } from './theme-preset.model';
import {
  getThemePreset,
  isThemeId,
  THEME_CSS_VAR_MAP,
  THEME_PRESETS,
} from './theme-presets.config';

describe('THEME_PRESETS', () => {
  // Cenário: Catálogo fixo de presets de tema e mapa de variáveis CSS.
  // Objetivo: Garantir que existam exatamente os 3 temas esperados ('sober', 'light', 'dark') com todos os tokens mapeados.
  it('should expose exactly 3 fixed theme presets with complete CSS token coverage', () => {
    expect(THEME_PRESETS.map((preset) => preset.id)).toEqual(['sober', 'light', 'dark']);

    const expectedKeys = Object.keys(THEME_CSS_VAR_MAP) as Array<keyof ThemeColorTokens>;
    for (const preset of THEME_PRESETS) {
      expect(preset.previewSwatches).toHaveLength(3);
      for (const tokenKey of expectedKeys) {
        expect(preset.tokens[tokenKey].trim().length).toBeGreaterThan(0);
      }
    }

    const sober = getThemePreset('sober');
    expect(sober.colorScheme).toBe('light');
    expect(sober.tokens.accentGradient).toContain('linear-gradient');
  });

  // Cenário: Validação de identificador de tema via isThemeId e resolução via getThemePreset.
  // Objetivo: Aceitar apenas ids válidos e retornar fallback seguro para valor desconhecido em runtime.
  it('should validate theme ids and resolve presets safely', () => {
    expect(isThemeId('sober')).toBe(true);
    expect(isThemeId('light')).toBe(true);
    expect(isThemeId('dark')).toBe(true);
    expect(isThemeId('neon')).toBe(false);
    expect(isThemeId(null)).toBe(false);

    expect(getThemePreset('dark').colorScheme).toBe('dark');
    expect(getThemePreset('unknown' as never).id).toBe('light');
  });
});
