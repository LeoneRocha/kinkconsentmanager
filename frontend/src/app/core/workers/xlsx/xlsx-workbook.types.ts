import {
  ChecklistSchema,
  ExportSummaryLayout,
  FlattenedChecklistRow,
  ResolvedPreviewTexts,
} from '../../models';

export interface XlsxExportLabels {
  readonly itemHeader: string;
  readonly valueHeader: string;
  readonly legendTitle: string;
  readonly layoutLabel: string;
}

export interface XlsxWorkbookBuildInput {
  readonly schema: ChecklistSchema;
  readonly rows: readonly FlattenedChecklistRow[];
  readonly texts: ResolvedPreviewTexts;
  readonly layout: ExportSummaryLayout;
  readonly labels: XlsxExportLabels;
}

export type XlsxBuildStage = 'preparing' | 'building' | 'packaging' | 'complete';

export interface XlsxGroupedRows {
  readonly groupId: string;
  readonly groupTitle: string;
  readonly rows: readonly FlattenedChecklistRow[];
}

export interface XlsxRichTextRun {
  readonly text: string;
  readonly bold?: boolean;
  readonly colorArgb: string;
  readonly size?: number;
}

export interface XlsxCellSpec {
  readonly col: number; // 1-based: 1 = A, 2 = B, ...
  readonly value: string;
  readonly styleId: number;
  readonly runs?: readonly XlsxRichTextRun[];
}

export interface XlsxRowSpec {
  readonly rowIndex: number;
  readonly height?: number;
  readonly cells: readonly XlsxCellSpec[];
}

export interface XlsxSheetConfig {
  readonly colWidths: readonly number[];
  readonly freezeTopRows: number;
  readonly landscape: boolean;
  readonly rows: readonly XlsxRowSpec[];
  readonly merges: readonly string[];
}

export interface XlsxLayoutBuildContext {
  readonly input: XlsxWorkbookBuildInput;
  readonly orderedScales: ChecklistSchema['scales'];
  readonly scaleStyleByColor: ReadonlyMap<string, number>;
}

/**
 * Contrato desacoplado para processadores de layout da planilha XLSX.
 */
export interface XlsxLayoutProcessor {
  readonly layout: ExportSummaryLayout;
  buildSheet(context: XlsxLayoutBuildContext): XlsxSheetConfig;
}

export const XLSX_STYLES = {
  DEFAULT: 0,
  TITLE: 1,
  META: 2,
  META_PLAIN: 3,
  CATEGORY_TITLE: 4,
  CLASSIC_CATEGORY_TITLE: 5,
  SUBTITLE_ITALIC: 6,
  COL_HEADER_LEFT: 7,
  COL_HEADER_CENTER: 8,
  ITEM_LABEL: 9,
  CLASSIC_ITEM_LABEL: 10,
  CLASSIC_TEXT_LABEL: 11,
  CLASSIC_TEXT_VALUE: 12,
  TEXT_VALUE: 13,
  UNANSWERED_CENTER: 14,
  UNANSWERED_LEFT: 15,
  CLASSIC_EMPTY_DOT: 16,
  LEGEND_HEADER: 17,
  LEGEND_DIVIDER: 18,
} as const;

export const FIRST_DYNAMIC_SCALE_STYLE_INDEX = 19;

export const BLACK_ARGB = 'FF111827';
export const MUTED_GRAY_ARGB = 'FF475569';
export const UNANSWERED_GRAY_ARGB = 'FF94A3B8';

export function groupRowsByCategory(
  rows: readonly FlattenedChecklistRow[],
): readonly XlsxGroupedRows[] {
  const map = new Map<string, { groupTitle: string; rows: FlattenedChecklistRow[] }>();
  for (const row of rows) {
    const existing = map.get(row.groupId);
    if (existing) {
      existing.rows.push(row);
    } else {
      map.set(row.groupId, { groupTitle: row.groupTitle, rows: [row] });
    }
  }
  return Array.from(map.entries()).map(([groupId, entry]) => ({
    groupId,
    groupTitle: entry.groupTitle,
    rows: entry.rows,
  }));
}

export function formatNonScaleTextValue(
  row: FlattenedChecklistRow,
  notAnsweredLabel: string,
): string {
  const baseValue =
    row.primaryValueLabel.trim().length > 0
      ? row.primaryValueLabel
      : row.selectedOptionsLabels.length > 0
        ? row.selectedOptionsLabels.join(', ')
        : notAnsweredLabel;

  const trimmedNote = row.customNote.trim();
  if (trimmedNote.length > 0 && !baseValue.includes(trimmedNote)) {
    return `${baseValue}\n${trimmedNote}`;
  }
  return baseValue;
}

export function estimateRowHeight(text: string, charsPerLine: number): number {
  const lines = text.split(/\r?\n/);
  let totalVisualLines = 0;
  for (const line of lines) {
    totalVisualLines += Math.max(1, Math.ceil(line.length / charsPerLine));
  }
  return Math.max(20, Math.min(180, totalVisualLines * 14 + 6));
}

export function toArgb(hexColor: string, fallback = BLACK_ARGB): string {
  const cleaned = hexColor.replace('#', '').trim().toUpperCase();
  if (/^[0-9A-F]{6}$/.test(cleaned)) {
    return `FF${cleaned}`;
  }
  if (/^[0-9A-F]{8}$/.test(cleaned)) {
    return cleaned;
  }
  return fallback;
}

/**
 * Mistura a cor da escala com branco para gerar preenchimentos pastéis claros na versão Moderna,
 * mantendo leitura nítida com fonte preta.
 */
export function blendWithWhite(hexColor: string, whiteRatio = 0.8): string {
  const cleaned = hexColor.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return 'FFF1F5F9';
  }
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  const tintChannel = (channel: number): string =>
    Math.round(channel + (255 - channel) * whiteRatio)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();

  return `FF${tintChannel(r)}${tintChannel(g)}${tintChannel(b)}`;
}

export function escapeXml(value: string): string {
  let cleaned = '';
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    const isValidXmlChar =
      code === 0x09 ||
      code === 0x0a ||
      code === 0x0d ||
      (code >= 0x20 && code <= 0xd7ff) ||
      (code >= 0xe000 && code <= 0xfffd);
    if (isValidXmlChar) {
      cleaned += value[i];
    }
  }
  return cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function columnLetter(col: number): string {
  let n = col;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters || 'A';
}
