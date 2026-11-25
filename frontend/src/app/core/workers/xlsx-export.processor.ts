import {
  ChecklistSchema,
  ExportSummaryLayout,
  FlattenedChecklistRow,
  ResolvedPreviewTexts,
} from '../models';

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

interface GroupedRows {
  readonly groupId: string;
  readonly groupTitle: string;
  readonly rows: readonly FlattenedChecklistRow[];
}

interface CellSpec {
  readonly col: number; // 1 = A, 2 = B, 3 = C
  readonly value: string;
  readonly styleId: number;
}

interface RowSpec {
  readonly rowIndex: number;
  readonly height?: number;
  readonly cells: readonly CellSpec[];
}

interface ZipEntry {
  readonly name: string;
  readonly data: Uint8Array;
}

const STYLE_MODERN_TITLE = 1;
const STYLE_MODERN_META = 2;
const STYLE_MODERN_GROUP_BANNER = 3;
const STYLE_MODERN_GROUP_DESC = 4;
const STYLE_MODERN_COL_HEADER = 5;
const STYLE_MODERN_COL_HEADER_CENTER = 6;
const STYLE_CLASSIC_TITLE = 7;
const STYLE_CLASSIC_META = 8;
const STYLE_CLASSIC_GROUP_BANNER = 9;
const STYLE_CLASSIC_COL_HEADER = 10;
const STYLE_CLASSIC_COL_HEADER_CENTER = 11;
const STYLE_ITEM_LABEL = 12;
const STYLE_ITEM_LABEL_CLASSIC_ZEBRA = 13;
const STYLE_TEXT_VALUE = 14;
const STYLE_TEXT_VALUE_CLASSIC_ZEBRA = 15;
const STYLE_UNANSWERED_CENTER = 16;
const STYLE_UNANSWERED_LEFT = 17;
const STYLE_LEGEND_HEADER_MODERN = 18;
const STYLE_LEGEND_HEADER_CLASSIC = 19;
const FIRST_SCALE_STYLE_INDEX = 20;

/**
 * Gera uma planilha Excel `.xlsx` (OOXML puro sem dependências externas) estilizada conforme
 * o layout selecionado no resumo (`modern` ou `classic`), incluindo paleta de cores das escalas,
 * cabeçalhos mesclados, legenda e ajuste automático de largura/altura.
 */
export function buildStyledXlsxWorkbook(
  input: XlsxWorkbookBuildInput,
  onProgress?: (stage: XlsxBuildStage, progress: number) => void,
): Uint8Array {
  onProgress?.('preparing', 20);

  const isClassic = input.layout === 'classic';
  const orderedScales = [...input.schema.scales].sort((a, b) => a.order - b.order);
  const scaleStyleByColor = new Map<string, number>();
  orderedScales.forEach((scale, idx) => {
    scaleStyleByColor.set(scale.color.toUpperCase(), FIRST_SCALE_STYLE_INDEX + idx);
  });

  const groupSchemaMap = new Map(input.schema.groups.map((group) => [group.id, group]));
  const groupedRows = groupRowsByCategory(input.rows);

  onProgress?.('building', 55);

  const rows: RowSpec[] = [];
  const merges: string[] = [];
  let rowIndex = 1;

  // Row 1: Title banner (A1:C1)
  const titleText = isClassic ? input.texts.title.toUpperCase() : input.texts.title;
  rows.push({
    rowIndex,
    height: 30,
    cells: [
      { col: 1, value: titleText, styleId: isClassic ? STYLE_CLASSIC_TITLE : STYLE_MODERN_TITLE },
      { col: 2, value: '', styleId: isClassic ? STYLE_CLASSIC_TITLE : STYLE_MODERN_TITLE },
      { col: 3, value: '', styleId: isClassic ? STYLE_CLASSIC_TITLE : STYLE_MODERN_TITLE },
    ],
  });
  merges.push(`A${rowIndex}:C${rowIndex}`);
  rowIndex += 1;

  // Row 2: Metadata + Selected layout (A2:C2)
  const metaText = `${input.texts.generatedAtLabel}: ${input.texts.generatedAtValue}  •  ${input.labels.layoutLabel}`;
  const metaStyle = isClassic ? STYLE_CLASSIC_META : STYLE_MODERN_META;
  rows.push({
    rowIndex,
    height: 22,
    cells: [
      { col: 1, value: metaText, styleId: metaStyle },
      { col: 2, value: '', styleId: metaStyle },
      { col: 3, value: '', styleId: metaStyle },
    ],
  });
  merges.push(`A${rowIndex}:C${rowIndex}`);
  rowIndex += 1;

  // Row 3: Spacer
  rowIndex += 1;

  // Legend Header + Legend Grid
  const legendHeaderText = isClassic
    ? input.labels.legendTitle.toUpperCase()
    : input.labels.legendTitle;
  const legendHeaderStyle = isClassic ? STYLE_LEGEND_HEADER_CLASSIC : STYLE_LEGEND_HEADER_MODERN;
  rows.push({
    rowIndex,
    height: 22,
    cells: [
      { col: 1, value: legendHeaderText, styleId: legendHeaderStyle },
      { col: 2, value: '', styleId: legendHeaderStyle },
      { col: 3, value: '', styleId: legendHeaderStyle },
    ],
  });
  merges.push(`A${rowIndex}:C${rowIndex}`);
  rowIndex += 1;

  const legendEntries: { text: string; styleId: number }[] = orderedScales.map((scale, idx) => {
    const label = input.texts.scales[scale.id] ?? scale.id;
    return {
      text: isClassic ? `● ${label}` : label,
      styleId: FIRST_SCALE_STYLE_INDEX + idx,
    };
  });
  legendEntries.push({
    text: isClassic ? `○ ${input.texts.notAnsweredLabel}` : input.texts.notAnsweredLabel,
    styleId: STYLE_UNANSWERED_CENTER,
  });

  for (let i = 0; i < legendEntries.length; i += 3) {
    const chunk = legendEntries.slice(i, i + 3);
    const cells: CellSpec[] = [];
    for (let col = 1; col <= 3; col += 1) {
      const entry = chunk[col - 1];
      cells.push({
        col,
        value: entry ? entry.text : '',
        styleId: entry ? entry.styleId : STYLE_UNANSWERED_CENTER,
      });
    }
    rows.push({ rowIndex, height: 22, cells });
    rowIndex += 1;
  }

  // Category sections
  for (const group of groupedRows) {
    rowIndex += 1; // Spacer before group

    const schemaGroup = groupSchemaMap.get(group.groupId);
    const rawGroupTitle = input.texts.groups[group.groupId]?.title ?? group.groupTitle;
    const groupTitle = isClassic ? rawGroupTitle.toUpperCase() : rawGroupTitle;
    const groupDescription = isClassic ? undefined : input.texts.groups[group.groupId]?.description;
    const hasDualRoleColumns = group.rows.some((row) => row.isDualRole);
    const groupRoles = schemaGroup ? input.texts.roles[schemaGroup.rolePairId] : undefined;
    const firstDualRow = group.rows.find((row) => row.isDualRole);
    const rawPrimaryHeader = groupRoles?.primary ?? firstDualRow?.primaryRoleLabel ?? '';
    const rawSecondaryHeader = groupRoles?.secondary ?? firstDualRow?.secondaryRoleLabel ?? '';
    const primaryColumnHeader = isClassic ? rawPrimaryHeader.toUpperCase() : rawPrimaryHeader;
    const secondaryColumnHeader = isClassic ? rawSecondaryHeader.toUpperCase() : rawSecondaryHeader;

    const bannerStyle = isClassic ? STYLE_CLASSIC_GROUP_BANNER : STYLE_MODERN_GROUP_BANNER;
    rows.push({
      rowIndex,
      height: 24,
      cells: [
        { col: 1, value: groupTitle, styleId: bannerStyle },
        { col: 2, value: '', styleId: bannerStyle },
        { col: 3, value: '', styleId: bannerStyle },
      ],
    });
    merges.push(`A${rowIndex}:C${rowIndex}`);
    rowIndex += 1;

    if (groupDescription && groupDescription.trim().length > 0) {
      rows.push({
        rowIndex,
        height: estimateRowHeight(groupDescription, 90),
        cells: [
          { col: 1, value: groupDescription, styleId: STYLE_MODERN_GROUP_DESC },
          { col: 2, value: '', styleId: STYLE_MODERN_GROUP_DESC },
          { col: 3, value: '', styleId: STYLE_MODERN_GROUP_DESC },
        ],
      });
      merges.push(`A${rowIndex}:C${rowIndex}`);
      rowIndex += 1;
    }

    // Column headers
    const colHeaderStyle = isClassic ? STYLE_CLASSIC_COL_HEADER : STYLE_MODERN_COL_HEADER;
    const colHeaderCenterStyle = isClassic
      ? STYLE_CLASSIC_COL_HEADER_CENTER
      : STYLE_MODERN_COL_HEADER_CENTER;
    const itemHeaderLabel = isClassic
      ? input.labels.itemHeader.toUpperCase()
      : input.labels.itemHeader;
    const valueHeaderLabel = isClassic
      ? input.labels.valueHeader.toUpperCase()
      : input.labels.valueHeader;

    if (hasDualRoleColumns) {
      rows.push({
        rowIndex,
        height: 21,
        cells: [
          { col: 1, value: itemHeaderLabel, styleId: colHeaderStyle },
          { col: 2, value: primaryColumnHeader, styleId: colHeaderCenterStyle },
          { col: 3, value: secondaryColumnHeader, styleId: colHeaderCenterStyle },
        ],
      });
    } else {
      rows.push({
        rowIndex,
        height: 21,
        cells: [
          { col: 1, value: itemHeaderLabel, styleId: colHeaderStyle },
          { col: 2, value: valueHeaderLabel, styleId: colHeaderStyle },
          { col: 3, value: '', styleId: colHeaderStyle },
        ],
      });
      merges.push(`B${rowIndex}:C${rowIndex}`);
    }
    rowIndex += 1;

    // Group rows
    group.rows.forEach((row, idx) => {
      const useClassicZebra = isClassic && idx % 2 === 1;
      const itemLabelStyle = useClassicZebra ? STYLE_ITEM_LABEL_CLASSIC_ZEBRA : STYLE_ITEM_LABEL;
      const plainTextStyle = useClassicZebra ? STYLE_TEXT_VALUE_CLASSIC_ZEBRA : STYLE_TEXT_VALUE;

      if (row.isDualRole) {
        const showRoleHint =
          row.primaryRoleLabel !== rawPrimaryHeader ||
          (row.secondaryRoleLabel ?? '') !== rawSecondaryHeader;

        const primaryFormatted = formatScaleCellValue(
          row.primaryValueLabel,
          row.primaryColor,
          showRoleHint ? row.primaryRoleLabel : undefined,
          isClassic,
          scaleStyleByColor,
        );
        const secondaryFormatted = formatScaleCellValue(
          row.secondaryValueLabel ?? input.texts.notAnsweredLabel,
          row.secondaryColor,
          showRoleHint ? row.secondaryRoleLabel : undefined,
          isClassic,
          scaleStyleByColor,
        );

        const maxHeight = Math.max(
          estimateRowHeight(row.itemLabel, 40),
          estimateRowHeight(primaryFormatted.text, 24),
          estimateRowHeight(secondaryFormatted.text, 24),
        );

        rows.push({
          rowIndex,
          height: maxHeight,
          cells: [
            { col: 1, value: row.itemLabel, styleId: itemLabelStyle },
            { col: 2, value: primaryFormatted.text, styleId: primaryFormatted.styleId },
            { col: 3, value: secondaryFormatted.text, styleId: secondaryFormatted.styleId },
          ],
        });
      } else if (row.primaryColor) {
        const singleFormatted = formatScaleCellValue(
          row.primaryValueLabel,
          row.primaryColor,
          undefined,
          isClassic,
          scaleStyleByColor,
        );
        const maxHeight = Math.max(
          estimateRowHeight(row.itemLabel, 40),
          estimateRowHeight(singleFormatted.text, 48),
        );

        rows.push({
          rowIndex,
          height: maxHeight,
          cells: [
            { col: 1, value: row.itemLabel, styleId: itemLabelStyle },
            { col: 2, value: singleFormatted.text, styleId: singleFormatted.styleId },
            { col: 3, value: '', styleId: singleFormatted.styleId },
          ],
        });
        merges.push(`B${rowIndex}:C${rowIndex}`);
      } else {
        const formattedText = formatNonScaleTextValue(row, input.texts.notAnsweredLabel);
        const isUnanswered =
          formattedText === input.texts.notAnsweredLabel && row.customNote.trim().length === 0;
        const cellStyle = isUnanswered ? STYLE_UNANSWERED_LEFT : plainTextStyle;
        const maxHeight = Math.max(
          estimateRowHeight(row.itemLabel, 40),
          estimateRowHeight(formattedText, 50),
        );

        rows.push({
          rowIndex,
          height: maxHeight,
          cells: [
            { col: 1, value: row.itemLabel, styleId: itemLabelStyle },
            { col: 2, value: formattedText, styleId: cellStyle },
            { col: 3, value: '', styleId: cellStyle },
          ],
        });
        merges.push(`B${rowIndex}:C${rowIndex}`);
      }

      rowIndex += 1;
    });
  }

  onProgress?.('packaging', 85);

  const encoder = new TextEncoder();
  const stylesXml = buildStylesXml(orderedScales, isClassic);
  const worksheetXml = buildWorksheetXml(rows, merges);

  const zipBytes = createZipArchive([
    { name: '[Content_Types].xml', data: encoder.encode(CONTENT_TYPES_XML) },
    { name: '_rels/.rels', data: encoder.encode(ROOT_RELS_XML) },
    { name: 'xl/workbook.xml', data: encoder.encode(WORKBOOK_XML) },
    { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(WORKBOOK_RELS_XML) },
    { name: 'xl/styles.xml', data: encoder.encode(stylesXml) },
    { name: 'xl/worksheets/sheet1.xml', data: encoder.encode(worksheetXml) },
  ]);

  onProgress?.('complete', 100);
  return zipBytes;
}

function groupRowsByCategory(rows: readonly FlattenedChecklistRow[]): readonly GroupedRows[] {
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

function formatScaleCellValue(
  valueLabel: string,
  color: string | undefined,
  roleHint: string | undefined,
  isClassic: boolean,
  scaleStyleByColor: ReadonlyMap<string, number>,
): { readonly text: string; readonly styleId: number } {
  const prefix = roleHint ? `${roleHint}: ` : '';
  if (color) {
    const styleId = scaleStyleByColor.get(color.toUpperCase()) ?? STYLE_TEXT_VALUE;
    const bullet = isClassic ? '● ' : '';
    return {
      text: `${bullet}${prefix}${valueLabel}`,
      styleId,
    };
  }
  return {
    text: `${isClassic ? '○ ' : ''}${prefix}${valueLabel}`,
    styleId: STYLE_UNANSWERED_CENTER,
  };
}

function formatNonScaleTextValue(row: FlattenedChecklistRow, notAnsweredLabel: string): string {
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

function estimateRowHeight(text: string, charsPerLine: number): number {
  const lines = text.split(/\r?\n/);
  let totalVisualLines = 0;
  for (const line of lines) {
    totalVisualLines += Math.max(1, Math.ceil(line.length / charsPerLine));
  }
  return Math.max(20, Math.min(180, totalVisualLines * 14 + 8));
}

function toArgb(hexColor: string, fallback = 'FFFFFFFF'): string {
  const cleaned = hexColor.replace('#', '').trim().toUpperCase();
  if (/^[0-9A-F]{6}$/.test(cleaned)) {
    return `FF${cleaned}`;
  }
  if (/^[0-9A-F]{8}$/.test(cleaned)) {
    return cleaned;
  }
  return fallback;
}

function escapeXml(value: string): string {
  // Strip XML 1.0 disallowed control chars except tab (9), LF (10), CR (13)
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

function columnLetter(col: number): string {
  if (col === 1) {
    return 'A';
  }
  if (col === 2) {
    return 'B';
  }
  return 'C';
}

function buildWorksheetXml(rows: readonly RowSpec[], merges: readonly string[]): string {
  const rowXmlParts = rows.map((row) => {
    const heightAttr = row.height ? ` ht="${row.height}" customHeight="1"` : '';
    const cellsXml = row.cells
      .map((cell) => {
        const ref = `${columnLetter(cell.col)}${row.rowIndex}`;
        const escaped = escapeXml(cell.value);
        return `<c r="${ref}" s="${cell.styleId}" t="inlineStr"><is><t xml:space="preserve">${escaped}</t></is></c>`;
      })
      .join('');
    return `<row r="${row.rowIndex}"${heightAttr}>${cellsXml}</row>`;
  });

  const mergesXml =
    merges.length > 0
      ? `<mergeCells count="${merges.length}">${merges
          .map((ref) => `<mergeCell ref="${ref}"/>`)
          .join('')}</mergeCells>`
      : '';

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' +
    '<sheetViews>' +
    '<sheetView tabSelected="1" workbookViewId="0">' +
    '<pane ySplit="2" topLeftCell="A3" activePane="bottomLeft" state="frozen"/>' +
    '</sheetView>' +
    '</sheetViews>' +
    '<sheetFormatPr defaultRowHeight="20"/>' +
    '<cols>' +
    '<col min="1" max="1" width="46" customWidth="1"/>' +
    '<col min="2" max="2" width="28" customWidth="1"/>' +
    '<col min="3" max="3" width="28" customWidth="1"/>' +
    '</cols>' +
    `<sheetData>${rowXmlParts.join('')}</sheetData>` +
    mergesXml +
    '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>' +
    '<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>' +
    '</worksheet>'
  );
}

function buildStylesXml(
  orderedScales: readonly { readonly color: string; readonly contrastColor: string }[],
  isClassic: boolean,
): string {
  const baseFonts = [
    '<font><sz val="10"/><color rgb="FF0F172A"/><name val="Segoe UI"/></font>', // 0
    '<font><b/><sz val="14"/><color rgb="FFFFFFFF"/><name val="Segoe UI"/></font>', // 1
    '<font><sz val="9"/><color rgb="FF475569"/><name val="Segoe UI"/></font>', // 2
    '<font><b/><sz val="11"/><color rgb="FF0F172A"/><name val="Segoe UI"/></font>', // 3
    '<font><i/><sz val="9"/><color rgb="FF475569"/><name val="Segoe UI"/></font>', // 4
    '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Segoe UI"/></font>', // 5
    '<font><b/><sz val="9.5"/><color rgb="FF334155"/><name val="Segoe UI"/></font>', // 6
    '<font><b/><sz val="9.5"/><color rgb="FF991B1B"/><name val="Segoe UI"/></font>', // 7
    '<font><b/><sz val="10"/><color rgb="FF0F172A"/><name val="Segoe UI"/></font>', // 8
    '<font><i/><sz val="9.5"/><color rgb="FF64748B"/><name val="Segoe UI"/></font>', // 9
    '<font><b/><sz val="10"/><color rgb="FF0F172A"/><name val="Segoe UI"/></font>', // 10
    '<font><b/><sz val="10"/><color rgb="FF991B1B"/><name val="Segoe UI"/></font>', // 11
    '<font><sz val="10"/><color rgb="FF0F172A"/><name val="Segoe UI"/></font>', // 12
  ];
  const scaleFonts = orderedScales.map(
    (scale) =>
      `<font><b/><sz val="9.5"/><color rgb="${toArgb(scale.contrastColor, 'FFFFFFFF')}"/><name val="Segoe UI"/></font>`,
  );
  const allFonts = [...baseFonts, ...scaleFonts];

  const baseFills = [
    '<fill><patternFill patternType="none"/></fill>', // 0
    '<fill><patternFill patternType="gray125"/></fill>', // 1
    '<fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/></patternFill></fill>', // 2
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/></patternFill></fill>', // 3
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill>', // 4
    '<fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/></patternFill></fill>', // 5
    '<fill><patternFill patternType="solid"><fgColor rgb="FF991B1B"/></patternFill></fill>', // 6
    '<fill><patternFill patternType="solid"><fgColor rgb="FFDC2626"/></patternFill></fill>', // 7
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFEF2F2"/></patternFill></fill>', // 8
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFEE2E2"/></patternFill></fill>', // 9
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFFF7F7"/></patternFill></fill>', // 10
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill>', // 11
  ];
  const scaleFills = orderedScales.map(
    (scale) =>
      `<fill><patternFill patternType="solid"><fgColor rgb="${toArgb(scale.color, 'FF334155')}"/></patternFill></fill>`,
  );
  const allFills = [...baseFills, ...scaleFills];

  const borders = [
    '<border><left/><right/><top/><bottom/><diagonal/></border>', // 0
    '<border>' +
      '<left style="thin"><color rgb="FFCBD5E1"/></left>' +
      '<right style="thin"><color rgb="FFCBD5E1"/></right>' +
      '<top style="thin"><color rgb="FFCBD5E1"/></top>' +
      '<bottom style="thin"><color rgb="FFCBD5E1"/></bottom>' +
      '<diagonal/>' +
      '</border>', // 1
    '<border>' +
      '<left style="thin"><color rgb="FFE2E8F0"/></left>' +
      '<right style="thin"><color rgb="FFE2E8F0"/></right>' +
      '<top style="thin"><color rgb="FFE2E8F0"/></top>' +
      '<bottom style="thin"><color rgb="FFE2E8F0"/></bottom>' +
      '<diagonal/>' +
      '</border>', // 2
  ];

  const baseXfs = [
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>', // 0 default
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 1 modernTitle
    '<xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 2 modernMeta
    '<xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 3 modernGroupBanner
    '<xf numFmtId="0" fontId="4" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 4 modernGroupDesc
    '<xf numFmtId="0" fontId="6" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 5 modernColHeader
    '<xf numFmtId="0" fontId="6" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>', // 6 modernColHeaderCenter
    '<xf numFmtId="0" fontId="1" fillId="6" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 7 classicTitle
    '<xf numFmtId="0" fontId="7" fillId="8" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 8 classicMeta
    '<xf numFmtId="0" fontId="5" fillId="7" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 9 classicGroupBanner
    '<xf numFmtId="0" fontId="7" fillId="9" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 10 classicColHeader
    '<xf numFmtId="0" fontId="7" fillId="9" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>', // 11 classicColHeaderCenter
    '<xf numFmtId="0" fontId="8" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 12 itemLabel
    '<xf numFmtId="0" fontId="8" fillId="10" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 13 itemLabelClassicZebra
    '<xf numFmtId="0" fontId="12" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 14 textValue
    '<xf numFmtId="0" fontId="12" fillId="10" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 15 textValueClassicZebra
    '<xf numFmtId="0" fontId="9" fillId="11" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>', // 16 unansweredCenter
    '<xf numFmtId="0" fontId="9" fillId="11" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 17 unansweredLeft
    '<xf numFmtId="0" fontId="10" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 18 legendHeaderModern
    '<xf numFmtId="0" fontId="11" fillId="9" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 19 legendHeaderClassic
  ];

  const borderId = isClassic ? 2 : 1;
  const scaleXfs = orderedScales.map((_, idx) => {
    const fontId = 13 + idx;
    const fillId = 12 + idx;
    return `<xf numFmtId="0" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>`;
  });
  const allXfs = [...baseXfs, ...scaleXfs];

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<fonts count="${allFonts.length}">${allFonts.join('')}</fonts>` +
    `<fills count="${allFills.length}">${allFills.join('')}</fills>` +
    `<borders count="${borders.length}">${borders.join('')}</borders>` +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    `<cellXfs count="${allXfs.length}">${allXfs.join('')}</cellXfs>` +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>'
  );
}

const CONTENT_TYPES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
  '</Types>';

const ROOT_RELS_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  '</Relationships>';

const WORKBOOK_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
  '<sheets><sheet name="Checklist" sheetId="1" r:id="rId1"/></sheets>' +
  '</workbook>';

const WORKBOOK_RELS_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  '</Relationships>';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = (CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZipArchive(entries: readonly ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const data = entry.data;
    const checksum = crc32(data);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true); // Local file header signature
    lv.setUint16(4, 20, true); // Version needed to extract (2.0)
    lv.setUint16(6, 0x0800, true); // UTF-8 filename flag
    lv.setUint16(8, 0, true); // Compression method: 0 (STORE)
    lv.setUint16(10, 0, true); // Last mod file time
    lv.setUint16(12, 0x5421, true); // Last mod file date
    lv.setUint32(14, checksum, true);
    lv.setUint32(18, data.length, true); // Compressed size
    lv.setUint32(22, data.length, true); // Uncompressed size
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true); // Extra field length
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true); // Central directory file header signature
    cv.setUint16(4, 20, true); // Version made by
    cv.setUint16(6, 20, true); // Version needed
    cv.setUint16(8, 0x0800, true); // UTF-8 flag
    cv.setUint16(10, 0, true); // Method: STORE
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x5421, true);
    cv.setUint32(16, checksum, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true); // Relative offset of local header
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  let centralSize = 0;
  for (const part of centralParts) {
    centralSize += part.length;
  }

  const endRecord = new Uint8Array(22);
  const ev = new DataView(endRecord.buffer);
  ev.setUint32(0, 0x06054b50, true); // End of central directory signature
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const totalSize = offset + centralSize + endRecord.length;
  const archive = new Uint8Array(totalSize);
  let cursor = 0;
  for (const part of localParts) {
    archive.set(part, cursor);
    cursor += part.length;
  }
  for (const part of centralParts) {
    archive.set(part, cursor);
    cursor += part.length;
  }
  archive.set(endRecord, cursor);

  return archive;
}
