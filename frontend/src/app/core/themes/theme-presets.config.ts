import { ThemeColorTokens, ThemeId, ThemePresetDefinition } from './theme-preset.model';

/**
 * Mapeia cada token semântico de `ThemeColorTokens` para a respectiva CSS custom property (`--kcm-*`).
 */
export const THEME_CSS_VAR_MAP: Readonly<Record<keyof ThemeColorTokens, string>> = {
  surfaceBg: '--kcm-surface-bg',
  surfaceCard: '--kcm-surface-card',
  surfaceElevated: '--kcm-surface-elevated',
  surfaceSubtle: '--kcm-surface-subtle',
  borderColor: '--kcm-border-color',
  borderStrong: '--kcm-border-strong',
  textPrimary: '--kcm-text-primary',
  textSecondary: '--kcm-text-secondary',
  textMuted: '--kcm-text-muted',
  accentPrimary: '--kcm-accent-primary',
  accentPrimaryHover: '--kcm-accent-primary-hover',
  accentSoft: '--kcm-accent-soft',
  accentText: '--kcm-accent-text',
  accentGradient: '--kcm-accent-gradient',
  topbarBg: '--kcm-topbar-bg',
  shadowSm: '--kcm-shadow-sm',
  shadowMd: '--kcm-shadow-md',
  shadowLg: '--kcm-shadow-lg',
  kbdBg: '--kcm-kbd-bg',
  ambientTop: '--kcm-ambient-top',
  ambientBottom: '--kcm-ambient-bottom',
  surfaceGradient: '--kcm-surface-gradient',
};

/**
 * Catálogo fixo atual de temas da aplicação (arquitetado sobre tokens para customização futura).
 */
export const THEME_PRESETS: readonly ThemePresetDefinition[] = [
  {
    id: 'sober',
    colorScheme: 'light',
    icon: 'fa-circle-half-stroke',
    labelKey: 'themeSoberLabel',
    descriptionKey: 'themeSoberDesc',
    activeAnnouncementKey: 'themeSoberActive',
    previewSwatches: [
      '#ffffff',
      '#0f172a',
      'linear-gradient(135deg, #0f172a 0%, #1d4ed8 60%, #0284c7 100%)',
    ],
    tokens: {
      surfaceBg: '#f8fafc',
      surfaceCard: '#ffffff',
      surfaceElevated: '#ffffff',
      surfaceSubtle: '#f1f5f9',
      borderColor: '#cbd5e1',
      borderStrong: '#94a3b8',
      textPrimary: '#090d16',
      textSecondary: '#1f2937',
      textMuted: '#4b5563',
      accentPrimary: '#1d4ed8',
      accentPrimaryHover: '#1e40af',
      accentSoft: 'rgba(29, 78, 216, 0.1)',
      accentText: '#1d4ed8',
      accentGradient: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 58%, #0284c7 100%)',
      topbarBg: 'rgba(255, 255, 255, 0.92)',
      shadowSm: '0 2px 10px rgba(9, 13, 22, 0.06)',
      shadowMd: '0 8px 24px rgba(9, 13, 22, 0.09)',
      shadowLg: '0 18px 42px rgba(9, 13, 22, 0.16)',
      kbdBg: 'rgba(15, 23, 42, 0.08)',
      ambientTop: 'rgba(29, 78, 216, 0.1)',
      ambientBottom: 'rgba(15, 23, 42, 0.08)',
      surfaceGradient: 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)',
    },
  },
  {
    id: 'light',
    colorScheme: 'light',
    icon: 'fa-sun',
    labelKey: 'themeLightLabel',
    descriptionKey: 'themeLightDesc',
    activeAnnouncementKey: 'themeLightActive',
    previewSwatches: ['#f8fafc', '#0f172a', '#dc2626'],
    tokens: {
      surfaceBg: '#f1f5f9',
      surfaceCard: '#ffffff',
      surfaceElevated: '#ffffff',
      surfaceSubtle: '#f8fafc',
      borderColor: '#e2e8f0',
      borderStrong: '#cbd5e1',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#64748b',
      accentPrimary: '#dc2626',
      accentPrimaryHover: '#b91c1c',
      accentSoft: 'rgba(220, 38, 38, 0.11)',
      accentText: '#dc2626',
      accentGradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
      topbarBg: 'rgba(255, 255, 255, 0.88)',
      shadowSm: '0 2px 10px rgba(15, 23, 42, 0.05)',
      shadowMd: '0 8px 24px rgba(15, 23, 42, 0.08)',
      shadowLg: '0 18px 42px rgba(15, 23, 42, 0.14)',
      kbdBg: 'rgba(15, 23, 42, 0.08)',
      ambientTop: 'rgba(220, 38, 38, 0.08)',
      ambientBottom: 'rgba(185, 28, 28, 0.06)',
      surfaceGradient: 'none',
    },
  },
  {
    id: 'dark',
    colorScheme: 'dark',
    icon: 'fa-moon',
    labelKey: 'themeDarkLabel',
    descriptionKey: 'themeDarkDesc',
    activeAnnouncementKey: 'themeDarkActive',
    previewSwatches: ['#0f1117', '#181c26', '#dc2626'],
    tokens: {
      surfaceBg: '#0f1117',
      surfaceCard: '#181c26',
      surfaceElevated: '#1f2431',
      surfaceSubtle: '#212635',
      borderColor: 'rgba(239, 68, 68, 0.28)',
      borderStrong: 'rgba(239, 68, 68, 0.52)',
      textPrimary: '#ffffff',
      textSecondary: '#e2e8f0',
      textMuted: '#94a3b8',
      accentPrimary: '#dc2626',
      accentPrimaryHover: '#b91c1c',
      accentSoft: 'rgba(220, 38, 38, 0.22)',
      accentText: '#ffffff',
      accentGradient: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
      topbarBg: 'rgba(20, 23, 32, 0.9)',
      shadowSm: '0 4px 16px rgba(0, 0, 0, 0.35)',
      shadowMd: '0 12px 28px rgba(0, 0, 0, 0.48)',
      shadowLg: '0 22px 48px rgba(0, 0, 0, 0.65)',
      kbdBg: 'rgba(241, 245, 249, 0.14)',
      ambientTop: 'rgba(220, 38, 38, 0.16)',
      ambientBottom: 'rgba(153, 27, 27, 0.12)',
      surfaceGradient: 'none',
    },
  },
];

const PRESET_MAP: ReadonlyMap<ThemeId, ThemePresetDefinition> = new Map(
  THEME_PRESETS.map((preset) => [preset.id, preset]),
);

/**
 * Type guard validando identificadores de tema suportados.
 */
export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && PRESET_MAP.has(value as ThemeId);
}

/**
 * Retorna a definição completa de um preset de tema pelo seu identificador.
 */
export function getThemePreset(id: ThemeId): ThemePresetDefinition {
  return PRESET_MAP.get(id) ?? THEME_PRESETS[1];
}
