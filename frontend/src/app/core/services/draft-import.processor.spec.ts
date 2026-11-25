import { parseAndValidateDraftContent, processDraftImportPayload } from './draft-import.processor';

describe('draft-import.processor', () => {
  // Cenário: Processamento e validação de rascunho JSON válido com reporte de progresso por etapa.
  // Objetivo: Garantir que todas as etapas de leitura/parse/validação sejam emitidas e o rascunho seja normalizado.
  it('should emit progress stages and validate a valid JSON draft', async () => {
    const stages: { stage: string; progress: number }[] = [];
    const rawContent = JSON.stringify({
      schemaVersion: '1.2.0',
      exportedAt: '2026-11-24T21:00:00.000Z',
      language: 'en-US',
      answers: {
        item_safeword: { selectedOption: 'opt_traffic' },
        item_rope: { primaryScale: 'enjoy' },
      },
    });

    const summary = await processDraftImportPayload(
      {
        requestId: 'req-1',
        expectedSchemaVersion: '1.0.0',
        rawContent,
      },
      (stage, progress) => stages.push({ stage, progress }),
    );

    expect(stages).toEqual([
      { stage: 'reading', progress: 20 },
      { stage: 'parsing', progress: 55 },
      { stage: 'validating', progress: 85 },
      { stage: 'complete', progress: 100 },
    ]);
    expect(summary.answeredCount).toBe(2);
    expect(summary.validation.valid).toBe(true);
    expect(summary.validation.draft?.language).toBe('en-US');
  });

  // Cenário: Rejeição de sintaxe inválida e versão incompatível no processador compartilhado.
  // Objetivo: Garantir mensagens descritivas sem lançar exceções não tratadas.
  it('should reject invalid JSON syntax and incompatible schema versions safely', () => {
    const syntaxResult = parseAndValidateDraftContent('{broken', '1.0.0');
    expect(syntaxResult.valid).toBe(false);
    expect(syntaxResult.errors).toEqual(['Invalid JSON syntax.']);

    const incompatible = parseAndValidateDraftContent(
      JSON.stringify({
        schemaVersion: '2.0.0',
        exportedAt: '2026-11-24T21:00:00.000Z',
        answers: {},
      }),
      '1.0.0',
    );
    expect(incompatible.valid).toBe(false);
    expect(incompatible.errors.some((e) => e.toLowerCase().includes('incompatible'))).toBe(true);
  });
});
