import { inject, Injectable, InjectionToken } from '@angular/core';
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import {
  ChecklistSchema,
  ExportResult,
  FlattenedChecklistRow,
  ResolvedPreviewTexts,
} from '../../../core/models';

export interface PdfCreatedDocument {
  download(defaultFileName?: string): Promise<void> | void;
}

export interface PdfMakerInstance {
  createPdf(documentDefinitions: TDocumentDefinitions): PdfCreatedDocument;
}

export type PdfMakerLoaderFn = () => Promise<PdfMakerInstance>;

interface PdfModuleShape {
  readonly default?: PdfModuleShape;
  createPdf?: (documentDefinitions: TDocumentDefinitions) => PdfCreatedDocument;
  addVirtualFileSystem?: (vfs: Record<string, string>) => void;
}

interface VfsModuleShape {
  readonly default?: Record<string, string>;
}

/**
 * Injectable pdfmake loader performing lazy bundle loading and VFS font initialization.
 */
export const PDF_MAKER_LOADER = new InjectionToken<PdfMakerLoaderFn>('PDF_MAKER_LOADER', {
  providedIn: 'root',
  factory: () => async (): Promise<PdfMakerInstance> => {
    const pdfMakeMod = (await import('pdfmake/build/pdfmake')) as unknown as PdfModuleShape;
    const vfsMod = (await import('pdfmake/build/vfs_fonts')) as unknown as VfsModuleShape &
      Record<string, string>;
    const pdfMake = pdfMakeMod.default ?? pdfMakeMod;
    const vfs = vfsMod.default ?? vfsMod;

    if (typeof pdfMake.addVirtualFileSystem === 'function') {
      pdfMake.addVirtualFileSystem(vfs as Record<string, string>);
    }

    if (typeof pdfMake.createPdf !== 'function') {
      throw new Error('pdfmake createPdf API could not be initialized.');
    }

    return pdfMake as PdfMakerInstance;
  },
});

interface GroupedRows {
  readonly groupId: string;
  readonly groupTitle: string;
  readonly rows: readonly FlattenedChecklistRow[];
}

/**
 * Generates multi-page vector PDF documents via lazy-loaded `pdfmake`.
 */
@Injectable({ providedIn: 'root' })
export class PdfExportService {
  private readonly pdfMakerLoader = inject(PDF_MAKER_LOADER);

  /**
   * Builds the declarative pdfmake document definition with header, scale legend,
   * per-group non-breaking tables, and dynamic page-numbered footer.
   */
  buildDocumentDefinition(
    schema: ChecklistSchema,
    rows: readonly FlattenedChecklistRow[],
    texts: ResolvedPreviewTexts,
  ): TDocumentDefinitions {
    const orderedScales = [...schema.scales].sort((a, b) => a.order - b.order);
    const scaleContrastByColor = new Map<string, string>(
      orderedScales.map((scale) => [scale.color.toUpperCase(), scale.contrastColor]),
    );
    const groupSchemaMap = new Map(schema.groups.map((group) => [group.id, group]));
    const groupedRows = this.groupRows(rows);

    const content: Content[] = [
      {
        text: texts.title,
        style: 'docTitle',
      },
      {
        columns: [
          {
            text: [
              { text: `${texts.schemaVersionLabel}: `, bold: true, color: '#475569' },
              { text: schema.schemaVersion, color: '#0F172A' },
            ],
            style: 'metaText',
          },
          {
            text: [
              { text: `${texts.generatedAtLabel}: `, bold: true, color: '#475569' },
              { text: texts.generatedAtValue, color: '#0F172A' },
            ],
            style: 'metaText',
            alignment: 'right',
          },
        ],
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
            lineColor: '#0F172A',
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
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#CBD5E1',
          vLineColor: () => '#CBD5E1',
        },
        margin: [0, 0, 0, 14],
      });
    }

    for (const group of groupedRows) {
      const schemaGroup = groupSchemaMap.get(group.groupId);
      const groupTitle = texts.groups[group.groupId]?.title ?? group.groupTitle;
      const groupDescription = texts.groups[group.groupId]?.description;
      const hasDualRoleColumns = group.rows.some((row) => row.isDualRole);
      const groupRoles = schemaGroup ? texts.roles[schemaGroup.rolePairId] : undefined;
      const firstDualRow = group.rows.find((row) => row.isDualRole);
      const primaryColumnHeader =
        groupRoles?.primary ?? firstDualRow?.primaryRoleLabel ?? '';
      const secondaryColumnHeader =
        groupRoles?.secondary ?? firstDualRow?.secondaryRoleLabel ?? '';

      const buildGroupBannerCell = (colSpan: number): TableCell =>
        groupDescription
          ? {
              stack: [
                { text: groupTitle, style: 'groupTitle' },
                { text: groupDescription, style: 'groupDescription', margin: [0, 2, 0, 0] },
              ],
              colSpan,
              fillColor: '#F1F5F9',
              margin: [6, 6, 6, 6],
            }
          : {
              text: groupTitle,
              style: 'groupTitle',
              colSpan,
              fillColor: '#F1F5F9',
              margin: [6, 6, 6, 6],
            };

      if (hasDualRoleColumns) {
        const body: TableCell[][] = [
          [buildGroupBannerCell(3), {}, {}],
          [
            { text: '', style: 'colHeader', fillColor: '#F8FAFC' },
            { text: primaryColumnHeader, style: 'colHeader', fillColor: '#F8FAFC' },
            { text: secondaryColumnHeader, style: 'colHeader', fillColor: '#F8FAFC' },
          ],
        ];

        for (const row of group.rows) {
          if (row.isDualRole) {
            const showRoleHint =
              row.primaryRoleLabel !== primaryColumnHeader ||
              (row.secondaryRoleLabel ?? '') !== secondaryColumnHeader;
            body.push([
              { text: row.itemLabel, style: 'itemLabel' },
              this.buildValueCell(
                row.primaryValueLabel,
                row.primaryColor,
                texts.notAnsweredLabel,
                scaleContrastByColor,
                showRoleHint ? row.primaryRoleLabel : undefined,
              ),
              this.buildValueCell(
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
              this.buildNonDualValueCell(row, texts.notAnsweredLabel, scaleContrastByColor, 2),
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
          layout: this.tableLayout(),
          margin: [0, 0, 0, 12],
        });
      } else {
        const body: TableCell[][] = [[buildGroupBannerCell(2), {}]];

        for (const row of group.rows) {
          body.push([
            { text: row.itemLabel, style: 'itemLabel' },
            this.buildNonDualValueCell(row, texts.notAnsweredLabel, scaleContrastByColor),
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
          layout: this.tableLayout(),
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
            text: `${texts.title} — v${schema.schemaVersion}`,
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
          color: '#0F172A',
        },
        metaText: {
          fontSize: 8.5,
        },
        groupTitle: {
          fontSize: 10.5,
          bold: true,
          color: '#0F172A',
        },
        groupDescription: {
          fontSize: 8.5,
          color: '#475569',
        },
        colHeader: {
          fontSize: 8.5,
          bold: true,
          color: '#475569',
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

  /**
   * Generates and triggers a browser download of the checklist PDF report.
   */
  async exportPdf(
    schema: ChecklistSchema,
    rows: readonly FlattenedChecklistRow[],
    texts: ResolvedPreviewTexts,
    filename?: string,
  ): Promise<ExportResult> {
    const resolvedFilename = this.resolveFilename(filename);

    try {
      const docDef = this.buildDocumentDefinition(schema, rows, texts);
      const pdfMake = await this.pdfMakerLoader();
      await pdfMake.createPdf(docDef).download(resolvedFilename);

      return {
        format: 'pdf',
        filename: resolvedFilename,
        success: true,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unexpected error during PDF generation.';
      return {
        format: 'pdf',
        filename: resolvedFilename,
        success: false,
        errorMessage,
      };
    }
  }

  private groupRows(rows: readonly FlattenedChecklistRow[]): readonly GroupedRows[] {
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

  private buildValueCell(
    valueLabel: string,
    color: string | undefined,
    notAnsweredLabel: string,
    scaleContrastByColor: ReadonlyMap<string, string>,
    roleHint?: string,
    colSpan?: number,
  ): TableCell {
    const prefix = roleHint ? `${roleHint}: ` : '';
    if (color) {
      const contrastColor = this.resolveContrastColor(color, scaleContrastByColor);
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

  private buildNonDualValueCell(
    row: FlattenedChecklistRow,
    notAnsweredLabel: string,
    scaleContrastByColor: ReadonlyMap<string, string>,
    colSpan?: number,
  ): TableCell {
    if (row.primaryColor) {
      return this.buildValueCell(
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

  private resolveContrastColor(
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

  private tableLayout() {
    return {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#CBD5E1',
      vLineColor: () => '#CBD5E1',
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => 5,
      paddingBottom: () => 5,
    };
  }

  private resolveFilename(filename?: string): string {
    const trimmed = filename?.trim();
    if (trimmed && trimmed.length > 0) {
      return trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
    }
    const dateStamp = new Date().toISOString().slice(0, 10);
    return `kink-consent-checklist-${dateStamp}.pdf`;
  }
}
