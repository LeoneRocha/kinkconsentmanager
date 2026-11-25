import { ExportSummaryLayout } from '../models';
import { ExportXlsxWorkerRequest } from './background-task-worker.types';
import {
  buildXlsxStylesXml,
  classicXlsxLayoutProcessor,
  FIRST_DYNAMIC_SCALE_STYLE_INDEX,
  modernXlsxLayoutProcessor,
  packageXlsxWorkbook,
  serializeXlsxWorksheetXml,
  XlsxBuildStage,
  XlsxExportLabels,
  XlsxLayoutProcessor,
  XlsxWorkbookBuildInput,
} from './xlsx';

export type {
  XlsxBuildStage,
  XlsxExportLabels,
  XlsxLayoutProcessor,
  XlsxWorkbookBuildInput,
} from './xlsx';

/**
 * Registro desacoplado de processadores de layout para exportação Excel `.xlsx`.
 */
export const XLSX_LAYOUT_PROCESSORS: Readonly<Record<ExportSummaryLayout, XlsxLayoutProcessor>> = {
  modern: modernXlsxLayoutProcessor,
  classic: classicXlsxLayoutProcessor,
};

/**
 * Orquestra a construção da planilha `.xlsx` delegando o layout selecionado para o
 * respectivo `XlsxLayoutProcessor` e serializando estilos, planilha e pacote ZIP OOXML.
 */
export function buildStyledXlsxWorkbook(
  input: XlsxWorkbookBuildInput,
  onProgress?: (stage: XlsxBuildStage, progress: number) => void,
): Uint8Array {
  onProgress?.('preparing', 20);

  const orderedScales = [...input.schema.scales].sort((a, b) => a.order - b.order);
  const scaleStyleByColor = new Map<string, number>();
  orderedScales.forEach((scale, idx) => {
    scaleStyleByColor.set(scale.color.toUpperCase(), FIRST_DYNAMIC_SCALE_STYLE_INDEX + idx);
  });

  onProgress?.('building', 55);

  const processor = XLSX_LAYOUT_PROCESSORS[input.layout] ?? modernXlsxLayoutProcessor;
  const sheet = processor.buildSheet({
    input,
    orderedScales,
    scaleStyleByColor,
  });

  onProgress?.('packaging', 85);

  const stylesXml = buildXlsxStylesXml(orderedScales, processor.layout === 'classic');
  const worksheetXml = serializeXlsxWorksheetXml(sheet);
  const archive = packageXlsxWorkbook(stylesXml, worksheetXml);

  onProgress?.('complete', 100);
  return archive;
}

/**
 * Processador específico para requisições de exportação XLSX enviadas ao Web Worker.
 */
export function processXlsxExportPayload(
  request: ExportXlsxWorkerRequest,
  onProgress?: (stage: XlsxBuildStage, progress: number) => void,
): Uint8Array {
  return buildStyledXlsxWorkbook(
    {
      schema: request.schema,
      rows: request.rows,
      texts: request.texts,
      layout: request.layout,
      labels: request.labels,
    },
    onProgress,
  );
}
