import { FlattenedChecklistRow, ItemDefinition } from '../../models';
import {
  BLACK_ARGB,
  columnLetter,
  estimateRowHeight,
  formatNonScaleTextValue,
  groupRowsByCategory,
  toArgb,
  UNANSWERED_GRAY_ARGB,
  XLSX_STYLES,
  XlsxCellSpec,
  XlsxGroupedRows,
  XlsxLayoutBuildContext,
  XlsxLayoutProcessor,
  XlsxRichTextRun,
  XlsxRowSpec,
  XlsxSheetConfig,
} from './xlsx-workbook.types';

function formatClassicDotCell(
  color: string | undefined,
  scaleDotStyleByColor: ReadonlyMap<string, number>,
): { readonly text: string; readonly styleId: number } {
  if (color) {
    const styleId = scaleDotStyleByColor.get(color.toUpperCase()) ?? XLSX_STYLES.CLASSIC_EMPTY_DOT;
    return { text: '●', styleId };
  }
  return { text: '○', styleId: XLSX_STYLES.CLASSIC_EMPTY_DOT };
}

/**
 * Processador dedicado ao layout **Clássico** minimalista no Excel:
 * zero preenchimentos de fundo, fontes pretas com cabeçalhos maiores em negrito,
 * bolinhas coloridas ●/○ à esquerda de cada prática e 3 colunas balanceadas espelhando a tela.
 */
export const classicXlsxLayoutProcessor: XlsxLayoutProcessor = {
  layout: 'classic',
  buildSheet(context: XlsxLayoutBuildContext): XlsxSheetConfig {
    const { input, orderedScales, scaleStyleByColor } = context;
    const groupSchemaMap = new Map(input.schema.groups.map((group) => [group.id, group]));
    const itemSchemaMap = new Map<string, ItemDefinition>();
    for (const group of input.schema.groups) {
      for (const item of group.items) {
        itemSchemaMap.set(item.id, item);
      }
    }

    const groupedRows = groupRowsByCategory(input.rows);
    const grid = new Map<number, Map<number, XlsxCellSpec>>();
    const rowHeights = new Map<number, number>();
    const merges: string[] = [];

    const setCell = (rowIdx: number, col: number, spec: XlsxCellSpec): void => {
      let cols = grid.get(rowIdx);
      if (!cols) {
        cols = new Map<number, XlsxCellSpec>();
        grid.set(rowIdx, cols);
      }
      cols.set(col, spec);
    };

    const setRowHeight = (rowIdx: number, h: number): void => {
      const prev = rowHeights.get(rowIdx) ?? 18;
      if (h > prev) {
        rowHeights.set(rowIdx, h);
      }
    };

    const mergeAndFill = (
      rowIdx: number,
      startCol: number,
      endCol: number,
      spec: Omit<XlsxCellSpec, 'col'>,
    ): void => {
      for (let col = startCol; col <= endCol; col += 1) {
        setCell(rowIdx, col, {
          col,
          value: col === startCol ? spec.value : '',
          styleId: spec.styleId,
          ...(col === startCol && spec.runs ? { runs: spec.runs } : {}),
        });
      }
      if (endCol > startCol) {
        merges.push(`${columnLetter(startCol)}${rowIdx}:${columnLetter(endCol)}${rowIdx}`);
      }
    };

    mergeAndFill(1, 1, 11, { value: input.texts.title, styleId: XLSX_STYLES.TITLE });
    setRowHeight(1, 28);

    mergeAndFill(2, 1, 11, {
      value: `${input.texts.generatedAtLabel}: ${input.texts.generatedAtValue}`,
      styleId: XLSX_STYLES.META_PLAIN,
    });
    setRowHeight(2, 18);

    const legendRuns: XlsxRichTextRun[] = [
      { text: '○ ', colorArgb: UNANSWERED_GRAY_ARGB, size: 11 },
      { text: `${input.texts.notAnsweredLabel}`, colorArgb: BLACK_ARGB, size: 9.5 },
    ];
    for (const scale of orderedScales) {
      const label = input.texts.scales[scale.id] ?? scale.id;
      legendRuns.push(
        { text: '    ● ', bold: true, colorArgb: toArgb(scale.color, BLACK_ARGB), size: 11 },
        { text: label, colorArgb: BLACK_ARGB, size: 9.5 },
      );
    }
    mergeAndFill(3, 1, 11, {
      value: legendRuns.map((r) => r.text).join(''),
      styleId: XLSX_STYLES.LEGEND_DIVIDER,
      runs: legendRuns,
    });
    setRowHeight(3, 24);

    const isScaleRow = (row: FlattenedChecklistRow): boolean => {
      const schemaItem = itemSchemaMap.get(row.itemId);
      return schemaItem?.type === 'scale_matrix' || row.isDualRole || Boolean(row.primaryColor);
    };

    const estimateGroupLines = (group: XlsxGroupedRows): number => {
      let lines = 3;
      for (const row of group.rows) {
        lines += isScaleRow(row) ? 1 : 2;
      }
      return lines;
    };

    const trackGroups: XlsxGroupedRows[][] = [[], [], []];
    const groupHeights = groupedRows.map(estimateGroupLines);
    const totalLines = groupHeights.reduce((sum, val) => sum + val, 0);
    const targetLinesPerTrack = Math.max(1, Math.ceil(totalLines / 3));

    let trackIdx = 0;
    let currentTrackLines = 0;
    groupedRows.forEach((group, idx) => {
      const remainingGroups = groupedRows.length - idx;
      const remainingTracks = 2 - trackIdx;
      if (
        trackIdx < 2 &&
        currentTrackLines > 0 &&
        currentTrackLines + groupHeights[idx] * 0.5 > targetLinesPerTrack &&
        remainingGroups >= remainingTracks
      ) {
        trackIdx += 1;
        currentTrackLines = 0;
      }
      trackGroups[trackIdx].push(group);
      currentTrackLines += groupHeights[idx];
    });

    const baseColumns = [1, 5, 9] as const;

    trackGroups.forEach((groupsInTrack, tIdx) => {
      const c0 = baseColumns[tIdx];
      let r = 5;

      for (const group of groupsInTrack) {
        const schemaGroup = groupSchemaMap.get(group.groupId);
        const groupTitle = input.texts.groups[group.groupId]?.title ?? group.groupTitle;
        const hasScaleRows = group.rows.some(isScaleRow);
        const hasDualRoleColumns = group.rows.some((row) => row.isDualRole);
        const groupRoles = schemaGroup ? input.texts.roles[schemaGroup.rolePairId] : undefined;
        const firstDualRow = group.rows.find((row) => row.isDualRole);
        const primaryRole = groupRoles?.primary ?? firstDualRow?.primaryRoleLabel ?? '';
        const secondaryRole = groupRoles?.secondary ?? firstDualRow?.secondaryRoleLabel ?? '';

        mergeAndFill(r, c0, c0 + 2, {
          value: groupTitle,
          styleId: XLSX_STYLES.CLASSIC_CATEGORY_TITLE,
        });
        setRowHeight(r, 23);
        r += 1;

        if (hasDualRoleColumns || hasScaleRows) {
          const subtitle = hasDualRoleColumns ? `${primaryRole}, ${secondaryRole}` : primaryRole;
          if (subtitle.trim().length > 0) {
            mergeAndFill(r, c0, c0 + 2, {
              value: subtitle,
              styleId: XLSX_STYLES.SUBTITLE_ITALIC,
            });
            setRowHeight(r, 18);
            r += 1;
          }
        }

        for (const row of group.rows) {
          if (isScaleRow(row)) {
            const primaryDot = formatClassicDotCell(row.primaryColor, scaleStyleByColor);
            setCell(r, c0, { col: c0, value: primaryDot.text, styleId: primaryDot.styleId });

            if (row.isDualRole) {
              const secondaryDot = formatClassicDotCell(row.secondaryColor, scaleStyleByColor);
              setCell(r, c0 + 1, {
                col: c0 + 1,
                value: secondaryDot.text,
                styleId: secondaryDot.styleId,
              });
            } else {
              setCell(r, c0 + 1, { col: c0 + 1, value: '', styleId: XLSX_STYLES.DEFAULT });
            }

            setCell(r, c0 + 2, {
              col: c0 + 2,
              value: row.itemLabel,
              styleId: XLSX_STYLES.CLASSIC_ITEM_LABEL,
            });
            setRowHeight(r, estimateRowHeight(row.itemLabel, 33));
            r += 1;
          } else {
            const formattedText = formatNonScaleTextValue(row, input.texts.notAnsweredLabel);
            mergeAndFill(r, c0, c0 + 2, {
              value: `${row.itemLabel}:`,
              styleId: XLSX_STYLES.CLASSIC_TEXT_LABEL,
            });
            setRowHeight(r, estimateRowHeight(`${row.itemLabel}:`, 40));
            r += 1;

            mergeAndFill(r, c0, c0 + 2, {
              value: formattedText,
              styleId: XLSX_STYLES.CLASSIC_TEXT_VALUE,
            });
            setRowHeight(r, estimateRowHeight(formattedText, 40));
            r += 1;
          }
        }

        r += 1;
      }
    });

    const sortedRowIndices = Array.from(grid.keys()).sort((a, b) => a - b);
    const rows: XlsxRowSpec[] = sortedRowIndices.map((rowIdx) => {
      const colsMap = grid.get(rowIdx)!;
      const sortedCols = Array.from(colsMap.keys()).sort((a, b) => a - b);
      return {
        rowIndex: rowIdx,
        height: rowHeights.get(rowIdx) ?? 20,
        cells: sortedCols.map((col) => colsMap.get(col)!),
      };
    });

    return {
      colWidths: [3.4, 3.4, 36, 3, 3.4, 3.4, 36, 3, 3.4, 3.4, 36],
      freezeTopRows: 3,
      landscape: true,
      rows,
      merges,
    };
  },
};
