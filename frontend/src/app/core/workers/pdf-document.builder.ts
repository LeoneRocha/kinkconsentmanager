import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import {
  ChecklistSchema,
  ExportSummaryLayout,
  FlattenedChecklistRow,
  ResolvedPreviewTexts,
} from '../models';

interface GroupedRows {
  readonly groupId: string;
  readonly groupTitle: string;
  readonly rows: readonly FlattenedChecklistRow[];
}

/**
 * Constrói a definição declarativa do documento `pdfmake` de acordo com o layout selecionado
 * (`modern` ou `classic`), incluindo cabeçalho, legenda de escalas, tabelas por categoria e rodapé paginado.
 */
export function buildPdfDocumentDefinition(
  schema: ChecklistSchema,
  rows: readonly FlattenedChecklistRow[],
  texts: ResolvedPreviewTexts,
  layout: ExportSummaryLayout = 'modern',
): TDocumentDefinitions {
  const isClassic = layout === 'classic';
  const orderedScales = [...schema.scales].sort((a, b) => a.order - b.order);
  const scaleContrastByColor = new Map<string, string>(
    orderedScales.map((scale) => [scale.color.toUpperCase(), scale.contrastColor]),
  );
  const groupSchemaMap = new Map(schema.groups.map((group) => [group.id, group]));
  const groupedRows = groupFlattenedRows(rows);

  const dividerColor = isClassic ? '#DC2626' : '#0F172A';
  const metaLabelColor = isClassic ? '#991B1B' : '#475569';
  const groupBannerFill = isClassic ? '#DC2626' : '#F1F5F9';
  const colHeaderFill = isClassic ? '#FEE2E2' : '#F8FAFC';

  const content: Content[] = [
    {
      text: isClassic ? texts.title.toUpperCase() : texts.title,
      style: 'docTitle',
    },
    {
      text: [
        { text: `${texts.generatedAtLabel}: `, bold: true, color: metaLabelColor },
        { text: texts.generatedAtValue, color: '#0F172A' },
      ],
      style: 'metaText',
      margin: [0, 4, 0, 6],
    },
    {
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 531,
          y2: 0,
          lineWidth: 1.5,
          lineColor: dividerColor,
        },
      ],
      margin: [0, 0, 0, 10],
    },
  ];

  if (orderedScales.length > 0) {
    content.push({
      table: {
        widths: orderedScales.map(() => '*'),
        dontBreakRows: true,
        body: [
          orderedScales.map((scale) => ({
            text: texts.scales[scale.id] ?? scale.id,
            fillColor: scale.color,
            color: scale.contrastColor,
            bold: true,
            fontSize: 8.5,
            alignment: 'center' as const,
            margin: [4, 4, 4, 4] as [number, number, number, number],
          })),
        ],
      },
      layout: createTableLayout(isClassic),
      margin: [0, 0, 0, 14],
    });
  }

  for (const group of groupedRows) {
    const schemaGroup = groupSchemaMap.get(group.groupId);
    const rawGroupTitle = texts.groups[group.groupId]?.title ?? group.groupTitle;
    const groupTitle = isClassic ? rawGroupTitle.toUpperCase() : rawGroupTitle;
    const groupDescription = isClassic ? undefined : texts.groups[group.groupId]?.description;
    const hasDualRoleColumns = group.rows.some((row) => row.isDualRole);
    const groupRoles = schemaGroup ? texts.roles[schemaGroup.rolePairId] : undefined;
    const firstDualRow = group.rows.find((row) => row.isDualRole);
    const rawPrimaryHeader = groupRoles?.primary ?? firstDualRow?.primaryRoleLabel ?? '';
    const rawSecondaryHeader = groupRoles?.secondary ?? firstDualRow?.secondaryRoleLabel ?? '';
    const primaryColumnHeader = isClassic ? rawPrimaryHeader.toUpperCase() : rawPrimaryHeader;
    const secondaryColumnHeader = isClassic ? rawSecondaryHeader.toUpperCase() : rawSecondaryHeader;

    const buildGroupBannerCell = (colSpan: number): TableCell =>
      groupDescription
        ? {
            stack: [
              { text: groupTitle, style: 'groupTitle' },
              { text: groupDescription, style: 'groupDescription', margin: [0, 2, 0, 0] },
            ],
            colSpan,
            fillColor: groupBannerFill,
            margin: [6, 6, 6, 6],
          }
        : {
            text: groupTitle,
            style: 'groupTitle',
            colSpan,
            fillColor: groupBannerFill,
            margin: [6, 6, 6, 6],
          };

    if (hasDualRoleColumns) {
      const body: TableCell[][] = [
        [buildGroupBannerCell(3), {}, {}],
        [
          { text: '', style: 'colHeader', fillColor: colHeaderFill },
          { text: primaryColumnHeader, style: 'colHeader', fillColor: colHeaderFill },
          { text: secondaryColumnHeader, style: 'colHeader', fillColor: colHeaderFill },
        ],
      ];

      for (const row of group.rows) {
        if (row.isDualRole) {
          const showRoleHint =
            row.primaryRoleLabel !== rawPrimaryHeader ||
            (row.secondaryRoleLabel ?? '') !== rawSecondaryHeader;
          body.push([
            { text: row.itemLabel, style: 'itemLabel' },
            buildValueCell(
              row.primaryValueLabel,
              row.primaryColor,
              texts.notAnsweredLabel,
              scaleContrastByColor,
              showRoleHint ? row.primaryRoleLabel : undefined,
            ),
            buildValueCell(
              row.secondaryValueLabel ?? texts.notAnsweredLabel,
              row.secondaryColor,
              texts.notAnsweredLabel,
              scaleContrastByColor,
              showRoleHint ? row.secondaryRoleLabel : undefined,
            ),
          ]);
        } else {
          body.push([
            { text: row.itemLabel, style: 'itemLabel' },
            buildNonDualValueCell(row, texts.notAnsweredLabel, scaleContrastByColor, 2),
            {},
          ]);
        }
      }

      content.push({
        table: {
          widths: ['46%', '27%', '27%'],
          headerRows: 2,
          keepWithHeaderRows: 1,
          dontBreakRows: true,
          body,
        },
        layout: createTableLayout(isClassic),
        margin: [0, 0, 0, 12],
      });
    } else {
      const body: TableCell[][] = [[buildGroupBannerCell(2), {}]];

      for (const row of group.rows) {
        body.push([
          { text: row.itemLabel, style: 'itemLabel' },
          buildNonDualValueCell(row, texts.notAnsweredLabel, scaleContrastByColor),
        ]);
      }

      content.push({
        table: {
          widths: ['46%', '54%'],
          headerRows: 1,
          keepWithHeaderRows: 1,
          dontBreakRows: true,
          body,
        },
        layout: createTableLayout(isClassic),
        margin: [0, 0, 0, 12],
      });
    }
  }

  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [32, 36, 32, 44],
    info: {
      title: texts.title,
    },
    content,
    footer: (currentPage: number, pageCount: number): Content => ({
      columns: [
        {
          text: texts.title,
          style: 'footerText',
          alignment: 'left',
        },
        {
          text: `Page ${currentPage} / ${pageCount}`,
          style: 'footerText',
          alignment: 'right',
        },
      ],
      margin: [32, 12, 32, 0],
    }),
    defaultStyle: {
      font: 'Roboto',
      fontSize: 9.5,
      color: '#0F172A',
    },
    styles: {
      docTitle: {
        fontSize: 16,
        bold: true,
        color: isClassic ? '#991B1B' : '#0F172A',
      },
      metaText: {
        fontSize: 8.5,
      },
      groupTitle: {
        fontSize: 10.5,
        bold: true,
        color: isClassic ? '#FFFFFF' : '#0F172A',
      },
      groupDescription: {
        fontSize: 8.5,
        color: '#475569',
      },
      colHeader: {
        fontSize: 8.5,
        bold: true,
        color: isClassic ? '#991B1B' : '#475569',
      },
      itemLabel: {
        fontSize: 9.5,
        bold: true,
        color: '#0F172A',
      },
      unansweredText: {
        fontSize: 9,
        italics: true,
        color: '#64748B',
      },
      footerText: {
        fontSize: 8,
        color: '#64748B',
      },
    },
  };
}

function groupFlattenedRows(rows: readonly FlattenedChecklistRow[]): readonly GroupedRows[] {
  const groupsMap = new Map<string, { groupTitle: string; rows: FlattenedChecklistRow[] }>();

  for (const row of rows) {
    const existing = groupsMap.get(row.groupId);
    if (existing) {
      existing.rows.push(row);
    } else {
      groupsMap.set(row.groupId, {
        groupTitle: row.groupTitle,
        rows: [row],
      });
    }
  }

  return Array.from(groupsMap.entries()).map(([groupId, entry]) => ({
    groupId,
    groupTitle: entry.groupTitle,
    rows: entry.rows,
  }));
}

function buildValueCell(
  valueLabel: string,
  color: string | undefined,
  notAnsweredLabel: string,
  scaleContrastByColor: ReadonlyMap<string, string>,
  roleHint?: string,
  colSpan?: number,
): TableCell {
  const prefix = roleHint ? `${roleHint}: ` : '';
  if (color) {
    const contrastColor = resolvePdfContrastColor(color, scaleContrastByColor);
    return {
      text: `${prefix}${valueLabel}`,
      fillColor: color,
      color: contrastColor,
      bold: true,
      fontSize: 9,
      ...(colSpan ? { colSpan } : {}),
    };
  }

  const isUnanswered = valueLabel === notAnsweredLabel;
  return {
    text: `${prefix}${valueLabel}`,
    style: isUnanswered ? 'unansweredText' : undefined,
    ...(colSpan ? { colSpan } : {}),
  };
}

function buildNonDualValueCell(
  row: FlattenedChecklistRow,
  notAnsweredLabel: string,
  scaleContrastByColor: ReadonlyMap<string, string>,
  colSpan?: number,
): TableCell {
  if (row.primaryColor) {
    return buildValueCell(
      row.primaryValueLabel,
      row.primaryColor,
      notAnsweredLabel,
      scaleContrastByColor,
      undefined,
      colSpan,
    );
  }

  const baseValue =
    row.primaryValueLabel.trim().length > 0
      ? row.primaryValueLabel
      : row.selectedOptionsLabels.length > 0
        ? row.selectedOptionsLabels.join(', ')
        : notAnsweredLabel;

  const trimmedNote = row.customNote.trim();
  if (trimmedNote.length > 0 && !baseValue.includes(trimmedNote)) {
    return {
      text: [
        { text: baseValue },
        { text: `\n${trimmedNote}`, italics: true, fontSize: 8.5, color: '#334155' },
      ],
      ...(colSpan ? { colSpan } : {}),
    };
  }

  const isUnanswered = baseValue === notAnsweredLabel && trimmedNote.length === 0;
  return {
    text: baseValue,
    style: isUnanswered ? 'unansweredText' : undefined,
    ...(colSpan ? { colSpan } : {}),
  };
}

function resolvePdfContrastColor(
  hexColor: string,
  scaleContrastByColor: ReadonlyMap<string, string>,
): string {
  const mapped = scaleContrastByColor.get(hexColor.toUpperCase());
  if (mapped) {
    return mapped;
  }

  const normalized = hexColor.replace('#', '').trim();
  if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#111827' : '#FFFFFF';
  }

  return '#FFFFFF';
}

function createTableLayout(isClassic: boolean) {
  const borderColor = isClassic ? '#E2E8F0' : '#CBD5E1';
  return {
    hLineWidth: () => 0.5,
    vLineWidth: () => 0.5,
    hLineColor: () => borderColor,
    vLineColor: () => borderColor,
    paddingLeft: () => 6,
    paddingRight: () => 6,
    paddingTop: () => 5,
    paddingBottom: () => 5,
  };
}
