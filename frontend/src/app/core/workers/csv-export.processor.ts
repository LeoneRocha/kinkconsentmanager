import { FlattenedChecklistRow } from '../models';

const UTF8_BOM = '\uFEFF';
const CSV_HEADERS: readonly string[] = [
  'Group_ID',
  'Category',
  'Item_ID',
  'Item_Label',
  'Role_Mode',
  'Giving_Or_Primary_Response',
  'Receiving_Or_Secondary_Response',
  'Selected_Options',
  'Custom_Note',
];

/**
 * Constrói o conteúdo CSV RFC-4180 com BOM UTF-8 a partir das linhas normalizadas do checklist.
 * Compartilhado entre `CsvExportService` e o Web Worker de background.
 */
export function buildCsvContentFromRows(rows: readonly FlattenedChecklistRow[]): string {
  const lines: string[] = [CSV_HEADERS.join(',')];

  for (const row of rows) {
    const cells = [
      row.groupId,
      row.groupTitle,
      row.itemId,
      row.itemLabel,
      row.isDualRole ? 'dual' : 'single',
      row.primaryValueLabel,
      row.isDualRole ? (row.secondaryValueLabel ?? '') : '',
      row.selectedOptionsLabels.join('; '),
      row.customNote,
    ];
    lines.push(cells.map((cell) => escapeCsvCell(cell)).join(','));
  }

  return `${UTF8_BOM}${lines.join('\r\n')}`;
}

function escapeCsvCell(value: string): string {
  const normalized = value ?? '';
  if (
    normalized.includes(',') ||
    normalized.includes('"') ||
    normalized.includes('\r') ||
    normalized.includes('\n')
  ) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}
