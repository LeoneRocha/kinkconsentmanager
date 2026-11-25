import type { Content, ContentStack, TDocumentDefinitions } from 'pdfmake/interfaces';
import {
  ChecklistSchema,
  FlattenedChecklistRow,
  ItemDefinition,
  ResolvedPreviewTexts,
} from '../models';

/**
 * CONTRACT — Classic PDF layout (locked to PNG Classic):
 * - Landscape A4 with 4 balanced columns (same visual density as PNG print `column-count: 4`)
 * - Header: title + generated-at on the left; circle legend (unanswered ○ + scale ●) on the right
 * - Groups: bold category title + italic role subtitle; no crimson table banners
 * - Scale rows: colored ● / empty ○ markers + item label (dual-role = two markers)
 * - Text rows: "Label:" then value (no colored fill cells)
 *
 * Do NOT change this layout without explicit product/design approval.
 * Unit tests in `pdf-classic-layout.builder.spec.ts` enforce this contract.
 */
export const CLASSIC_PDF_LAYOUT_CONTRACT = {
  pageOrientation: 'landscape',
  pageSize: 'A4',
  columnCount: 4,
  filledMarker: '●',
  emptyMarker: '○',
} as const;

interface GroupedRows {
  readonly groupId: string;
  readonly groupTitle: string;
  readonly rows: readonly FlattenedChecklistRow[];
}

/**
 * Builds the Classic pdfmake definition mirroring the PNG Classic multi-column circle sheet.
 */
export function buildClassicPdfDocumentDefinition(
  schema: ChecklistSchema,
  rows: readonly FlattenedChecklistRow[],
  texts: ResolvedPreviewTexts,
): TDocumentDefinitions {
  const orderedScales = [...schema.scales].sort((a, b) => a.order - b.order);
  const groupSchemaMap = new Map(schema.groups.map((group) => [group.id, group]));
  const itemSchemaMap = new Map<string, ItemDefinition>();
  for (const group of schema.groups) {
    for (const item of group.items) {
      itemSchemaMap.set(item.id, item);
    }
  }

  const groupedRows = groupFlattenedRows(rows);
  const columnStacks = distributeGroupsIntoColumns(
    groupedRows,
    CLASSIC_PDF_LAYOUT_CONTRACT.columnCount,
    (group) => estimateGroupWeight(group, itemSchemaMap),
  ).map((columnGroups) =>
    buildColumnStack(columnGroups, texts, groupSchemaMap, itemSchemaMap),
  );

  const legendParts: Content[] = [
    {
      text: [
        {
          text: `${CLASSIC_PDF_LAYOUT_CONTRACT.emptyMarker} `,
          color: '#94A3B8',
        },
        { text: texts.notAnsweredLabel, color: '#0F172A' },
      ],
      fontSize: 8,
      margin: [0, 0, 10, 0],
    },
  ];
  for (const scale of orderedScales) {
    legendParts.push({
      text: [
        {
          text: `${CLASSIC_PDF_LAYOUT_CONTRACT.filledMarker} `,
          color: scale.color,
          bold: true,
        },
        { text: texts.scales[scale.id] ?? scale.id, color: '#0F172A' },
      ],
      fontSize: 8,
      margin: [0, 0, 10, 0],
    });
  }

  const content: Content[] = [
    {
      columns: [
        {
          width: '*',
          stack: [
            { text: texts.title, style: 'docTitle' },
            {
              text: `${texts.generatedAtLabel}: ${texts.generatedAtValue}`,
              style: 'metaText',
              margin: [0, 2, 0, 0],
            },
          ],
        },
        {
          width: 'auto',
          columns: legendParts,
          columnGap: 0,
        },
      ],
      columnGap: 16,
      margin: [0, 0, 0, 6],
    },
    {
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 775,
          y2: 0,
          lineWidth: 1.5,
          lineColor: '#0F172A',
        },
      ],
      margin: [0, 0, 0, 12],
    },
    {
      columns: columnStacks.map((stack) => ({
        width: '*',
        stack,
      })),
      columnGap: 14,
    },
  ];

  return {
    pageSize: CLASSIC_PDF_LAYOUT_CONTRACT.pageSize,
    pageOrientation: CLASSIC_PDF_LAYOUT_CONTRACT.pageOrientation,
    pageMargins: [28, 28, 28, 36],
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
      margin: [28, 8, 28, 0],
    }),
    defaultStyle: {
      font: 'Roboto',
      fontSize: 9,
      color: '#0F172A',
    },
    styles: {
      docTitle: {
        fontSize: 15,
        bold: true,
        color: '#0F172A',
      },
      metaText: {
        fontSize: 8,
        color: '#475569',
      },
      groupTitle: {
        fontSize: 10,
        bold: true,
        color: '#0F172A',
      },
      groupRoles: {
        fontSize: 8,
        italics: true,
        color: '#64748B',
      },
      itemLabel: {
        fontSize: 8.5,
        color: '#0F172A',
      },
      textLabel: {
        fontSize: 8,
        bold: true,
        color: '#475569',
      },
      textValue: {
        fontSize: 8,
        color: '#0F172A',
      },
      unansweredText: {
        fontSize: 8,
        italics: true,
        color: '#94A3B8',
      },
      footerText: {
        fontSize: 7.5,
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

function isScaleRow(
  row: FlattenedChecklistRow,
  itemSchemaMap: ReadonlyMap<string, ItemDefinition>,
): boolean {
  const schemaItem = itemSchemaMap.get(row.itemId);
  return schemaItem?.type === 'scale_matrix' || row.isDualRole || Boolean(row.primaryColor);
}

function estimateGroupWeight(
  group: GroupedRows,
  itemSchemaMap: ReadonlyMap<string, ItemDefinition>,
): number {
  let weight = 3;
  for (const row of group.rows) {
    weight += isScaleRow(row, itemSchemaMap) ? 1 : 2;
  }
  return weight;
}

function distributeGroupsIntoColumns(
  groups: readonly GroupedRows[],
  columnCount: number,
  estimateWeight: (group: GroupedRows) => number,
): GroupedRows[][] {
  const columns: GroupedRows[][] = Array.from({ length: columnCount }, () => []);
  if (groups.length === 0) {
    return columns;
  }

  const weights = groups.map(estimateWeight);
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  const targetPerColumn = Math.max(1, Math.ceil(totalWeight / columnCount));

  let columnIdx = 0;
  let currentWeight = 0;

  groups.forEach((group, idx) => {
    const remainingGroups = groups.length - idx;
    const remainingColumns = columnCount - 1 - columnIdx;
    if (
      columnIdx < columnCount - 1 &&
      currentWeight > 0 &&
      currentWeight + weights[idx] * 0.5 > targetPerColumn &&
      remainingGroups >= remainingColumns
    ) {
      columnIdx += 1;
      currentWeight = 0;
    }
    columns[columnIdx].push(group);
    currentWeight += weights[idx];
  });

  return columns;
}

function buildColumnStack(
  groups: readonly GroupedRows[],
  texts: ResolvedPreviewTexts,
  groupSchemaMap: ReadonlyMap<string, ChecklistSchema['groups'][number]>,
  itemSchemaMap: ReadonlyMap<string, ItemDefinition>,
): Content[] {
  const stack: Content[] = [];

  for (const group of groups) {
    const schemaGroup = groupSchemaMap.get(group.groupId);
    const groupTitle = texts.groups[group.groupId]?.title ?? group.groupTitle;
    const hasScaleRows = group.rows.some((row) => isScaleRow(row, itemSchemaMap));
    const hasDualRoleColumns = group.rows.some((row) => row.isDualRole);
    const groupRoles = schemaGroup ? texts.roles[schemaGroup.rolePairId] : undefined;
    const firstDualRow = group.rows.find((row) => row.isDualRole);
    const primaryRole = groupRoles?.primary ?? firstDualRow?.primaryRoleLabel ?? '';
    const secondaryRole = groupRoles?.secondary ?? firstDualRow?.secondaryRoleLabel ?? '';

    const groupStack: Content[] = [{ text: groupTitle, style: 'groupTitle', margin: [0, 0, 0, 2] }];

    if (hasDualRoleColumns || hasScaleRows) {
      const subtitle = hasDualRoleColumns
        ? [primaryRole, secondaryRole].filter((part) => part.trim().length > 0).join(', ')
        : primaryRole;
      if (subtitle.trim().length > 0) {
        groupStack.push({ text: subtitle, style: 'groupRoles', margin: [0, 0, 0, 4] });
      }
    }

    for (const row of group.rows) {
      if (isScaleRow(row, itemSchemaMap)) {
        groupStack.push(buildScaleRowContent(row));
      } else {
        groupStack.push(...buildTextRowContent(row, texts.notAnsweredLabel));
      }
    }

    stack.push({
      stack: groupStack,
      unbreakable: true,
      margin: [0, 0, 0, 10],
    } as ContentStack);
  }

  return stack;
}

function buildScaleRowContent(row: FlattenedChecklistRow): Content {
  const markers: Content[] = [
    {
      text: row.primaryColor
        ? CLASSIC_PDF_LAYOUT_CONTRACT.filledMarker
        : CLASSIC_PDF_LAYOUT_CONTRACT.emptyMarker,
      color: row.primaryColor ?? '#94A3B8',
      fontSize: 9,
      margin: [0, 0, 3, 0],
    },
  ];

  if (row.isDualRole) {
    markers.push({
      text: row.secondaryColor
        ? CLASSIC_PDF_LAYOUT_CONTRACT.filledMarker
        : CLASSIC_PDF_LAYOUT_CONTRACT.emptyMarker,
      color: row.secondaryColor ?? '#94A3B8',
      fontSize: 9,
      margin: [0, 0, 4, 0],
    });
  }

  return {
    columns: [
      {
        width: 'auto',
        columns: markers,
        columnGap: 0,
      },
      {
        width: '*',
        text: row.itemLabel,
        style: 'itemLabel',
      },
    ],
    columnGap: 4,
    margin: [0, 0, 0, 2],
  };
}

function buildTextRowContent(
  row: FlattenedChecklistRow,
  notAnsweredLabel: string,
): readonly Content[] {
  const value = formatNonScaleTextValue(row, notAnsweredLabel);
  const isUnanswered = value === notAnsweredLabel;

  return [
    {
      text: `${row.itemLabel}:`,
      style: 'textLabel',
      margin: [0, 2, 0, 0],
    },
    {
      text: value,
      style: isUnanswered ? 'unansweredText' : 'textValue',
      margin: [0, 0, 0, 3],
    },
  ];
}

function formatNonScaleTextValue(
  row: FlattenedChecklistRow,
  notAnsweredLabel: string,
): string {
  const parts: string[] = [];
  if (row.primaryValueLabel.trim().length > 0) {
    parts.push(row.primaryValueLabel.trim());
  }
  if (row.selectedOptionsLabels.length > 0) {
    const optionsText = row.selectedOptionsLabels.join(', ');
    if (!parts.includes(optionsText)) {
      parts.push(optionsText);
    }
  }
  const note = row.customNote.trim();
  if (note.length > 0 && !parts.some((part) => part.includes(note))) {
    parts.push(note);
  }
  if (parts.length === 0) {
    return notAnsweredLabel;
  }
  return parts.join(' — ');
}
