import { FlattenedChecklistRow } from '../models';
import { BackgroundTaskStage, ExportCsvWorkerRequest } from './background-task-worker.types';

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
 * Compartilhado entre `CsvExportService` e o processador dedicado de CSV.
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

/**
 * Processador específico para requisições de exportação CSV em background.
 */
export function processCsvExportPayload(
  request: ExportCsvWorkerRequest,
  onProgress?: (stage: BackgroundTaskStage, progress: number) => void,
): string {
  onProgress?.('preparing', 30);
  onProgress?.('building', 70);
  const content = buildCsvContentFromRows(request.rows);
  onProgress?.('complete', 100);
  return content;
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
