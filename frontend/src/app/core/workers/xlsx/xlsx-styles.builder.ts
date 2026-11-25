import {
  BLACK_ARGB,
  blendWithWhite,
  MUTED_GRAY_ARGB,
  toArgb,
  UNANSWERED_GRAY_ARGB,
} from './xlsx-workbook.types';

/**
 * Constrói a folha de estilos OOXML (`xl/styles.xml`) com fontes pretas, títulos em negrito
 * e preenchimentos pastéis leves apenas nas escalas do modo Moderno (sem fundos no modo Clássico).
 */
export function buildXlsxStylesXml(
  orderedScales: readonly { readonly color: string }[],
  isClassic: boolean,
): string {
  const baseFonts = [
    `<font><sz val="10"/><color rgb="${BLACK_ARGB}"/><name val="Segoe UI"/></font>`, // 0 regular black
    `<font><b/><sz val="16"/><color rgb="${BLACK_ARGB}"/><name val="Segoe UI"/></font>`, // 1 title bold large
    `<font><sz val="9.5"/><color rgb="${MUTED_GRAY_ARGB}"/><name val="Segoe UI"/></font>`, // 2 meta muted
    `<font><b/><sz val="12"/><color rgb="${BLACK_ARGB}"/><name val="Segoe UI"/></font>`, // 3 category bold larger
    `<font><i/><sz val="9"/><color rgb="${MUTED_GRAY_ARGB}"/><name val="Segoe UI"/></font>`, // 4 subtitle/description italic
    `<font><b/><sz val="10"/><color rgb="${BLACK_ARGB}"/><name val="Segoe UI"/></font>`, // 5 col header / bold label
    `<font><i/><sz val="9.5"/><color rgb="${UNANSWERED_GRAY_ARGB}"/><name val="Segoe UI"/></font>`, // 6 unanswered italic
    `<font><sz val="12"/><color rgb="${UNANSWERED_GRAY_ARGB}"/><name val="Segoe UI"/></font>`, // 7 classic empty circle ○
    `<font><b/><sz val="9.5"/><color rgb="${BLACK_ARGB}"/><name val="Segoe UI"/></font>`, // 8 scale value black bold
  ];

  // Fontes 9+: na versão clássica cada escala recebe fonte colorida para desenhar ● sem fundo
  const scaleDotFonts = orderedScales.map(
    (scale) =>
      `<font><b/><sz val="13"/><color rgb="${toArgb(scale.color, BLACK_ARGB)}"/><name val="Segoe UI"/></font>`,
  );
  const allFonts = [...baseFonts, ...scaleDotFonts];

  const baseFills = [
    '<fill><patternFill patternType="none"/></fill>', // 0
    '<fill><patternFill patternType="gray125"/></fill>', // 1
  ];
  const scalePastelFills = isClassic
    ? []
    : orderedScales.map(
        (scale) =>
          `<fill><patternFill patternType="solid"><fgColor rgb="${blendWithWhite(scale.color, 0.8)}"/></patternFill></fill>`,
      );
  const allFills = [...baseFills, ...scalePastelFills];

  const borders = [
    '<border><left/><right/><top/><bottom/><diagonal/></border>', // 0 none
    '<border>' +
      '<left style="thin"><color rgb="FFE2E8F0"/></left>' +
      '<right style="thin"><color rgb="FFE2E8F0"/></right>' +
      '<top style="thin"><color rgb="FFE2E8F0"/></top>' +
      '<bottom style="thin"><color rgb="FFE2E8F0"/></bottom>' +
      '<diagonal/>' +
      '</border>', // 1 subtle all-around light border
    '<border>' +
      '<left/><right/><top/>' +
      '<bottom style="thin"><color rgb="FFCBD5E1"/></bottom>' +
      '<diagonal/>' +
      '</border>', // 2 subtle bottom divider rule
  ];

  const baseXfs = [
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>', // 0 DEFAULT
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 1 TITLE
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 2 META
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 3 META_PLAIN
    '<xf numFmtId="0" fontId="3" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 4 CATEGORY_TITLE
    '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 5 CLASSIC_CATEGORY_TITLE
    '<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 6 SUBTITLE_ITALIC
    '<xf numFmtId="0" fontId="5" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 7 COL_HEADER_LEFT
    '<xf numFmtId="0" fontId="5" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>', // 8 COL_HEADER_CENTER
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 9 ITEM_LABEL
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 10 CLASSIC_ITEM_LABEL
    '<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 11 CLASSIC_TEXT_LABEL
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 12 CLASSIC_TEXT_VALUE
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 13 TEXT_VALUE
    '<xf numFmtId="0" fontId="6" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>', // 14 UNANSWERED_CENTER
    '<xf numFmtId="0" fontId="6" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 15 UNANSWERED_LEFT
    '<xf numFmtId="0" fontId="7" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>', // 16 CLASSIC_EMPTY_DOT
    '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 17 LEGEND_HEADER
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>', // 18 LEGEND_DIVIDER
  ];

  const dynamicScaleXfs = orderedScales.map((_, idx) =>
    isClassic
      ? `<xf numFmtId="0" fontId="${9 + idx}" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>`
      : `<xf numFmtId="0" fontId="8" fillId="${2 + idx}" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>`,
  );
  const allXfs = [...baseXfs, ...dynamicScaleXfs];

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
