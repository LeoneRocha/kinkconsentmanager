import {
  estimateRowHeight,
  FIRST_DYNAMIC_SCALE_STYLE_INDEX,
  formatNonScaleTextValue,
  groupRowsByCategory,
  XLSX_STYLES,
  XlsxCellSpec,
  XlsxLayoutBuildContext,
  XlsxLayoutProcessor,
  XlsxRowSpec,
  XlsxSheetConfig,
} from './xlsx-workbook.types';

function formatModernScaleCellValue(
  valueLabel: string,
  color: string | undefined,
  roleHint: string | undefined,
  scaleStyleByColor: ReadonlyMap<string, number>,
): { readonly text: string; readonly styleId: number } {
  const prefix = roleHint ? `${roleHint}: ` : '';
  if (color) {
    const styleId = scaleStyleByColor.get(color.toUpperCase()) ?? XLSX_STYLES.TEXT_VALUE;
    return {
      text: `${prefix}${valueLabel}`,
      styleId,
    };
  }
  return {
    text: `${prefix}${valueLabel}`,
    styleId: XLSX_STYLES.UNANSWERED_CENTER,
  };
}

/**
 * Processador dedicado ao layout **Moderno** no Excel:
 * visual claro com cabeçalhos em negrito preto (sem fundos escuros) e células de escala em tons pastéis.
 */
export const modernXlsxLayoutProcessor: XlsxLayoutProcessor = {
  layout: 'modern',
  buildSheet(context: XlsxLayoutBuildContext): XlsxSheetConfig {
    const { input, orderedScales, scaleStyleByColor } = context;
    const groupSchemaMap = new Map(input.schema.groups.map((group) => [group.id, group]));
    const groupedRows = groupRowsByCategory(input.rows);

    const rows: XlsxRowSpec[] = [];
    const merges: string[] = [];
    let rowIndex = 1;

    rows.push({
      rowIndex,
      height: 30,
      cells: [
        { col: 1, value: input.texts.title, styleId: XLSX_STYLES.TITLE },
        { col: 2, value: '', styleId: XLSX_STYLES.TITLE },
        { col: 3, value: '', styleId: XLSX_STYLES.TITLE },
      ],
    });
    merges.push(`A${rowIndex}:C${rowIndex}`);
    rowIndex += 1;

    const metaText = `${input.texts.generatedAtLabel}: ${input.texts.generatedAtValue}  •  ${input.labels.layoutLabel}`;
    rows.push({
      rowIndex,
      height: 22,
      cells: [
        { col: 1, value: metaText, styleId: XLSX_STYLES.META },
        { col: 2, value: '', styleId: XLSX_STYLES.META },
        { col: 3, value: '', styleId: XLSX_STYLES.META },
      ],
    });
    merges.push(`A${rowIndex}:C${rowIndex}`);
    rowIndex += 1;

    rowIndex += 1; // Espaçamento

    rows.push({
      rowIndex,
      height: 24,
      cells: [
        { col: 1, value: input.labels.legendTitle, styleId: XLSX_STYLES.LEGEND_HEADER },
        { col: 2, value: '', styleId: XLSX_STYLES.LEGEND_HEADER },
        { col: 3, value: '', styleId: XLSX_STYLES.LEGEND_HEADER },
      ],
    });
    merges.push(`A${rowIndex}:C${rowIndex}`);
    rowIndex += 1;

    const legendEntries: { text: string; styleId: number }[] = orderedScales.map((scale, idx) => ({
      text: input.texts.scales[scale.id] ?? scale.id,
      styleId: FIRST_DYNAMIC_SCALE_STYLE_INDEX + idx,
    }));
    legendEntries.push({
      text: input.texts.notAnsweredLabel,
      styleId: XLSX_STYLES.UNANSWERED_CENTER,
    });

    for (let i = 0; i < legendEntries.length; i += 3) {
      const chunk = legendEntries.slice(i, i + 3);
      const cells: XlsxCellSpec[] = [];
      for (let col = 1; col <= 3; col += 1) {
        const entry = chunk[col - 1];
        cells.push({
          col,
          value: entry ? entry.text : '',
          styleId: entry ? entry.styleId : XLSX_STYLES.UNANSWERED_CENTER,
        });
      }
      rows.push({ rowIndex, height: 22, cells });
      rowIndex += 1;
    }

    for (const group of groupedRows) {
      rowIndex += 1;

      const schemaGroup = groupSchemaMap.get(group.groupId);
      const groupTitle = input.texts.groups[group.groupId]?.title ?? group.groupTitle;
      const groupDescription = input.texts.groups[group.groupId]?.description;
      const hasDualRoleColumns = group.rows.some((row) => row.isDualRole);
      const groupRoles = schemaGroup ? input.texts.roles[schemaGroup.rolePairId] : undefined;
      const firstDualRow = group.rows.find((row) => row.isDualRole);
      const primaryColumnHeader = groupRoles?.primary ?? firstDualRow?.primaryRoleLabel ?? '';
      const secondaryColumnHeader = groupRoles?.secondary ?? firstDualRow?.secondaryRoleLabel ?? '';

      rows.push({
        rowIndex,
        height: 25,
        cells: [
          { col: 1, value: groupTitle, styleId: XLSX_STYLES.CATEGORY_TITLE },
          { col: 2, value: '', styleId: XLSX_STYLES.CATEGORY_TITLE },
          { col: 3, value: '', styleId: XLSX_STYLES.CATEGORY_TITLE },
        ],
      });
      merges.push(`A${rowIndex}:C${rowIndex}`);
      rowIndex += 1;

      if (groupDescription && groupDescription.trim().length > 0) {
        rows.push({
          rowIndex,
          height: estimateRowHeight(groupDescription, 90),
          cells: [
            { col: 1, value: groupDescription, styleId: XLSX_STYLES.SUBTITLE_ITALIC },
            { col: 2, value: '', styleId: XLSX_STYLES.SUBTITLE_ITALIC },
            { col: 3, value: '', styleId: XLSX_STYLES.SUBTITLE_ITALIC },
          ],
        });
        merges.push(`A${rowIndex}:C${rowIndex}`);
        rowIndex += 1;
      }

      if (hasDualRoleColumns) {
        rows.push({
          rowIndex,
          height: 22,
          cells: [
            { col: 1, value: input.labels.itemHeader, styleId: XLSX_STYLES.COL_HEADER_LEFT },
            { col: 2, value: primaryColumnHeader, styleId: XLSX_STYLES.COL_HEADER_CENTER },
            { col: 3, value: secondaryColumnHeader, styleId: XLSX_STYLES.COL_HEADER_CENTER },
          ],
        });
      } else {
        rows.push({
          rowIndex,
          height: 22,
          cells: [
            { col: 1, value: input.labels.itemHeader, styleId: XLSX_STYLES.COL_HEADER_LEFT },
            { col: 2, value: input.labels.valueHeader, styleId: XLSX_STYLES.COL_HEADER_LEFT },
            { col: 3, value: '', styleId: XLSX_STYLES.COL_HEADER_LEFT },
          ],
        });
        merges.push(`B${rowIndex}:C${rowIndex}`);
      }
      rowIndex += 1;

      for (const row of group.rows) {
        if (row.isDualRole) {
          const showRoleHint =
            row.primaryRoleLabel !== primaryColumnHeader ||
            (row.secondaryRoleLabel ?? '') !== secondaryColumnHeader;

          const primaryFormatted = formatModernScaleCellValue(
            row.primaryValueLabel,
            row.primaryColor,
            showRoleHint ? row.primaryRoleLabel : undefined,
            scaleStyleByColor,
          );
          const secondaryFormatted = formatModernScaleCellValue(
            row.secondaryValueLabel ?? input.texts.notAnsweredLabel,
            row.secondaryColor,
            showRoleHint ? row.secondaryRoleLabel : undefined,
            scaleStyleByColor,
          );

          rows.push({
            rowIndex,
            height: Math.max(
              estimateRowHeight(row.itemLabel, 40),
              estimateRowHeight(primaryFormatted.text, 24),
              estimateRowHeight(secondaryFormatted.text, 24),
            ),
            cells: [
              { col: 1, value: row.itemLabel, styleId: XLSX_STYLES.ITEM_LABEL },
              { col: 2, value: primaryFormatted.text, styleId: primaryFormatted.styleId },
              { col: 3, value: secondaryFormatted.text, styleId: secondaryFormatted.styleId },
            ],
          });
        } else if (row.primaryColor) {
          const singleFormatted = formatModernScaleCellValue(
            row.primaryValueLabel,
            row.primaryColor,
            undefined,
            scaleStyleByColor,
          );
          rows.push({
            rowIndex,
            height: Math.max(
              estimateRowHeight(row.itemLabel, 40),
              estimateRowHeight(singleFormatted.text, 48),
            ),
            cells: [
              { col: 1, value: row.itemLabel, styleId: XLSX_STYLES.ITEM_LABEL },
              { col: 2, value: singleFormatted.text, styleId: singleFormatted.styleId },
              { col: 3, value: '', styleId: singleFormatted.styleId },
            ],
          });
          merges.push(`B${rowIndex}:C${rowIndex}`);
        } else {
          const formattedText = formatNonScaleTextValue(row, input.texts.notAnsweredLabel);
          const isUnanswered =
            formattedText === input.texts.notAnsweredLabel && row.customNote.trim().length === 0;
          const cellStyle = isUnanswered ? XLSX_STYLES.UNANSWERED_LEFT : XLSX_STYLES.TEXT_VALUE;

          rows.push({
            rowIndex,
            height: Math.max(
              estimateRowHeight(row.itemLabel, 40),
              estimateRowHeight(formattedText, 50),
            ),
            cells: [
              { col: 1, value: row.itemLabel, styleId: XLSX_STYLES.ITEM_LABEL },
              { col: 2, value: formattedText, styleId: cellStyle },
              { col: 3, value: '', styleId: cellStyle },
            ],
          });
          merges.push(`B${rowIndex}:C${rowIndex}`);
        }

        rowIndex += 1;
      }
    }

    return {
      colWidths: [46, 28, 28],
      freezeTopRows: 2,
      landscape: false,
      rows,
      merges,
    };
  },
};
