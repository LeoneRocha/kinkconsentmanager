import {
  ChecklistSchema,
  ExportSummaryLayout,
  FlattenedChecklistRow,
  ResolvedPreviewTexts,
  resolveOrderedScales,
  resolveScaleLabel,
} from '../models';
import { BackgroundTaskStage, ExportCsvWorkerRequest } from './background-task-worker.types';
import { formatNonScaleTextValue, groupRowsByCategory } from './xlsx/xlsx-workbook.types';

const UTF8_BOM = '\uFEFF';

export interface CsvExportLabels {
  readonly itemHeader: string;
  readonly valueHeader: string;
  readonly legendTitle: string;
  readonly layoutLabel?: string;
}

export interface CsvExportContext {
  readonly schema?: ChecklistSchema;
  readonly texts?: ResolvedPreviewTexts;
  readonly layout?: ExportSummaryLayout;
  readonly labels?: CsvExportLabels;
}

const DEFAULT_CSV_LABELS: CsvExportLabels = {
  itemHeader: 'Prática / Item',
  valueHeader: 'Resposta',
  legendTitle: 'Legenda da Escala',
};

/**
 * Constrói o conteúdo CSV RFC-4180 com BOM UTF-8 espelhando o relatório tabular do Excel (`.xlsx`),
 * agrupado por categoria com título, metadados, legenda das escalas e cabeçalhos localizados.
 * Compartilhado entre `CsvExportService` e o processador dedicado de CSV.
 */
export function buildCsvContentFromRows(
  rows: readonly FlattenedChecklistRow[],
  context?: CsvExportContext,
): string {
  const labels = context?.labels ?? DEFAULT_CSV_LABELS;
  const texts = context?.texts;
  const schema = context?.schema;
  const lines: string[] = [];

  const pushCsvRow = (cells: readonly string[]): void => {
    lines.push(cells.map((cell) => escapeCsvCell(cell)).join(','));
  };

  if (texts) {
    pushCsvRow([texts.title]);
    const layoutSuffix =
      labels.layoutLabel && labels.layoutLabel.trim().length > 0
        ? `  •  ${labels.layoutLabel.trim()}`
        : '';
    pushCsvRow([`${texts.generatedAtLabel}: ${texts.generatedAtValue}${layoutSuffix}`]);
  }

  if (schema && texts) {
    const orderedScales = resolveOrderedScales(schema.scales);
    const legendEntries = orderedScales.map((scale) => resolveScaleLabel(scale, texts.scales));
    legendEntries.push(texts.notAnsweredLabel);

    lines.push('');
    pushCsvRow([labels.legendTitle]);
    for (let i = 0; i < legendEntries.length; i += 3) {
      const chunk = legendEntries.slice(i, i + 3);
      pushCsvRow([chunk[0] ?? '', chunk[1] ?? '', chunk[2] ?? '']);
    }
  }

  const groupSchemaMap = schema
    ? new Map(schema.groups.map((group) => [group.id, group]))
    : undefined;
  const groupedRows = groupRowsByCategory(rows);
  const notAnsweredLabel = texts?.notAnsweredLabel ?? '';

  for (const group of groupedRows) {
    if (lines.length > 0) {
      lines.push('');
    }

    const schemaGroup = groupSchemaMap?.get(group.groupId);
    const groupTitle = texts?.groups[group.groupId]?.title ?? group.groupTitle;
    const groupDescription = texts?.groups[group.groupId]?.description;

    pushCsvRow([groupTitle]);
    if (groupDescription && groupDescription.trim().length > 0) {
      pushCsvRow([groupDescription]);
    }

    const hasDualRoleColumns = group.rows.some((row) => row.isDualRole);
    const groupRoles = schemaGroup && texts ? texts.roles[schemaGroup.rolePairId] : undefined;
    const firstDualRow = group.rows.find((row) => row.isDualRole);
    const primaryColumnHeader =
      groupRoles?.primary ?? firstDualRow?.primaryRoleLabel ?? labels.valueHeader;
    const secondaryColumnHeader = groupRoles?.secondary ?? firstDualRow?.secondaryRoleLabel ?? '';

    if (hasDualRoleColumns) {
      pushCsvRow([labels.itemHeader, primaryColumnHeader, secondaryColumnHeader]);
    } else {
      pushCsvRow([labels.itemHeader, labels.valueHeader]);
    }

    for (const row of group.rows) {
      if (row.isDualRole) {
        const showRoleHint =
          row.primaryRoleLabel !== primaryColumnHeader ||
          (row.secondaryRoleLabel ?? '') !== secondaryColumnHeader;
        const primaryText =
          showRoleHint && row.primaryRoleLabel
            ? `${row.primaryRoleLabel}: ${row.primaryValueLabel}`
            : row.primaryValueLabel;
        const secondaryRaw = row.secondaryValueLabel ?? notAnsweredLabel;
        const secondaryText =
          showRoleHint && row.secondaryRoleLabel
            ? `${row.secondaryRoleLabel}: ${secondaryRaw}`
            : secondaryRaw;
        pushCsvRow([row.itemLabel, primaryText, secondaryText]);
        continue;
      }

      if (row.primaryColor) {
        pushCsvRow([row.itemLabel, row.primaryValueLabel]);
        continue;
      }

      pushCsvRow([row.itemLabel, formatNonScaleTextValue(row, notAnsweredLabel)]);
    }
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
  const content = buildCsvContentFromRows(request.rows, request.context);
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
