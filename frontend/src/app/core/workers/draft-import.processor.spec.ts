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

  // Cenário: Importação de JSON com BOM UTF-8, objetos de resposta vazios, campos malformados e respostas completas (not_applicable, __other__, texto).
  // Objetivo: Garantir tolerância a BOM, remoção de entradas vazias e rejeição de tipos inválidos em respostas sem vazar propriedades de protótipo.
  it('should accept UTF-8 BOM, strip empty answer entries, and reject invalid answer field types', () => {
    const bomJson =
      '\uFEFF' +
      JSON.stringify({
        schemaVersion: '1.0.0',
        exportedAt: '2026-11-25T13:10:00.000Z',
        language: 'pt-BR',
        answers: {
          empty_entry: {},
          item_bondage: { primaryScale: 'not_applicable', secondaryScale: 'enjoy' },
          item_safeword: { selectedOption: '__other__', otherText: 'Tap twice' },
        },
      });

    const validResult = parseAndValidateDraftContent(bomJson, '1.0.0');
    expect(validResult.valid).toBe(true);
    expect(validResult.draft?.answers['empty_entry']).toBeUndefined();
    expect(validResult.draft?.answers['item_bondage']).toEqual({
      primaryScale: 'not_applicable',
      secondaryScale: 'enjoy',
    });
    expect(validResult.draft?.answers['item_safeword']).toEqual({
      selectedOption: '__other__',
      otherText: 'Tap twice',
    });

    const invalidFieldTypes = parseAndValidateDraftContent(
      JSON.stringify({
        schemaVersion: '1.0.0',
        exportedAt: '2026-11-25T13:10:00.000Z',
        answers: {
          item_a: { primaryScale: 123 },
          item_b: { selectedOptions: 'not-an-array' },
        },
      }),
      '1.0.0',
    );
    expect(invalidFieldTypes.valid).toBe(false);
    expect(invalidFieldTypes.errors).toEqual([
      'Invalid "primaryScale" value for item "item_a".',
      'Invalid "selectedOptions" array for item "item_b".',
    ]);
  });
});
