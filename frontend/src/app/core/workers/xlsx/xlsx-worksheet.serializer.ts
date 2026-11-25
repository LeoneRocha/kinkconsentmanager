import { createZipArchive } from './ooxml-zip.writer';
import { columnLetter, escapeXml, XlsxCellSpec, XlsxSheetConfig } from './xlsx-workbook.types';

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

function serializeCellInlineContent(cell: XlsxCellSpec): string {
  if (cell.runs && cell.runs.length > 0) {
    const runsXml = cell.runs
      .map((run) => {
        const boldTag = run.bold ? '<b/>' : '';
        const sizeTag = `<sz val="${run.size ?? 10}"/>`;
        return (
          `<r><rPr>${boldTag}${sizeTag}<color rgb="${run.colorArgb}"/><rFont val="Segoe UI"/></rPr>` +
          `<t xml:space="preserve">${escapeXml(run.text)}</t></r>`
        );
      })
      .join('');
    return `<is>${runsXml}</is>`;
  }

  return `<is><t xml:space="preserve">${escapeXml(cell.value)}</t></is>`;
}

/**
 * Serializa a definição estruturada de planilha em XML OOXML (`xl/worksheets/sheet1.xml`).
 */
export function serializeXlsxWorksheetXml(sheet: XlsxSheetConfig): string {
  const rowXmlParts = sheet.rows.map((row) => {
    const heightAttr = row.height ? ` ht="${row.height}" customHeight="1"` : '';
    const cellsXml = row.cells
      .map((cell) => {
        const ref = `${columnLetter(cell.col)}${row.rowIndex}`;
        return `<c r="${ref}" s="${cell.styleId}" t="inlineStr">${serializeCellInlineContent(cell)}</c>`;
      })
      .join('');
    return `<row r="${row.rowIndex}"${heightAttr}>${cellsXml}</row>`;
  });

  const mergesXml =
    sheet.merges.length > 0
      ? `<mergeCells count="${sheet.merges.length}">${sheet.merges
          .map((ref) => `<mergeCell ref="${ref}"/>`)
          .join('')}</mergeCells>`
      : '';

  const colsXml = sheet.colWidths
    .map(
      (width, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`,
    )
    .join('');

  const topLeftRow = sheet.freezeTopRows + 1;
  const orientation = sheet.landscape ? 'landscape' : 'portrait';

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' +
    '<sheetViews>' +
    `<sheetView tabSelected="1" workbookViewId="0"${sheet.landscape ? ' showGridLines="0"' : ''}>` +
    `<pane ySplit="${sheet.freezeTopRows}" topLeftCell="A${topLeftRow}" activePane="bottomLeft" state="frozen"/>` +
    '</sheetView>' +
    '</sheetViews>' +
    '<sheetFormatPr defaultRowHeight="20"/>' +
    `<cols>${colsXml}</cols>` +
    `<sheetData>${rowXmlParts.join('')}</sheetData>` +
    mergesXml +
    '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.25" footer="0.25"/>' +
    `<pageSetup paperSize="9" orientation="${orientation}" fitToWidth="1" fitToHeight="0"/>` +
    '</worksheet>'
  );
}

/**
 * Empacota todos os componentes OOXML em um arquivo `.xlsx` completo.
 */
export function packageXlsxWorkbook(stylesXml: string, worksheetXml: string): Uint8Array {
  const encoder = new TextEncoder();
  return createZipArchive([
    { name: '[Content_Types].xml', data: encoder.encode(CONTENT_TYPES_XML) },
    { name: '_rels/.rels', data: encoder.encode(ROOT_RELS_XML) },
    { name: 'xl/workbook.xml', data: encoder.encode(WORKBOOK_XML) },
    { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(WORKBOOK_RELS_XML) },
    { name: 'xl/styles.xml', data: encoder.encode(stylesXml) },
    { name: 'xl/worksheets/sheet1.xml', data: encoder.encode(worksheetXml) },
  ]);
}
