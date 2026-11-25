export type ThemeId = 'sober' | 'light' | 'dark';
export type ThemeColorScheme = 'light' | 'dark';

/**
 * Mapeamento estruturado de tokens visuais do tema.
 * Permite tanto presets fixos quanto sobrescrita granular futura por cores personalizadas.
 */
export interface ThemeColorTokens {
  readonly surfaceBg: string;
  readonly surfaceCard: string;
  readonly surfaceElevated: string;
  readonly surfaceSubtle: string;
  readonly borderColor: string;
  readonly borderStrong: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly textMuted: string;
  readonly accentPrimary: string;
  readonly accentPrimaryHover: string;
  readonly accentSoft: string;
  readonly accentText: string;
  readonly accentGradient: string;
  readonly topbarBg: string;
  readonly shadowSm: string;
  readonly shadowMd: string;
  readonly shadowLg: string;
  readonly kbdBg: string;
  readonly ambientTop: string;
  readonly ambientBottom: string;
  readonly surfaceGradient: string;
}

export interface ThemePresetDefinition {
  readonly id: ThemeId;
  readonly colorScheme: ThemeColorScheme;
  readonly icon: string;
  readonly labelKey: string;
  readonly descriptionKey: string;
  readonly activeAnnouncementKey: string;
  readonly previewSwatches: readonly [string, string, string];
  readonly tokens: ThemeColorTokens;
}
