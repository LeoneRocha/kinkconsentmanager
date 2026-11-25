import { TestBed } from '@angular/core/testing';
import { ChecklistSchema, FlattenedChecklistRow, ResolvedPreviewTexts } from '../models';
import {
  BACKGROUND_TASK_TIMING_CONFIG,
  BackgroundTaskWorkerService,
  resolveEnvironmentTimingConfig,
} from './background-task-worker.service';
import { BACKGROUND_TASK_WORKER_FACTORY, BackgroundWorkerMessage } from '../workers';

const MOCK_SCHEMA: ChecklistSchema = {
  schemaVersion: '1.0.0',
  scales: [
    { id: 'enjoy', order: 1, color: '#388E3C', contrastColor: '#FFFFFF', icon: 'pi pi-check' },
  ],
  groups: [
    {
      id: 'grp_bondage',
      order: 1,
      defaultDualRole: true,
      rolePairId: 'giving_receiving',
      items: [{ id: 'item_rope', type: 'scale_matrix' }],
    },
  ],
};

const MOCK_TEXTS: ResolvedPreviewTexts = {
  title: 'Checklist Report',
  schemaVersionLabel: 'Schema Version',
  generatedAtLabel: 'Generated at',
  generatedAtValue: '2026-11-24 21:00',
  notAnsweredLabel: 'Not answered',
  otherLabel: 'Other',
  scales: { enjoy: 'Enjoy' },
  roles: { giving_receiving: { primary: 'Giving', secondary: 'Receiving' } },
  groups: { grp_bondage: { title: 'Bondage' } },
  items: { item_rope: { label: 'Rope' } },
  options: {},
};

const MOCK_ROWS: readonly FlattenedChecklistRow[] = [
  {
    groupId: 'grp_bondage',
    groupTitle: 'Bondage',
    itemId: 'item_rope',
    itemLabel: 'Rope',
    isDualRole: true,
    primaryRoleLabel: 'Giving',
    secondaryRoleLabel: 'Receiving',
    primaryValueLabel: 'Enjoy',
    secondaryValueLabel: 'Enjoy',
    primaryColor: '#388E3C',
    secondaryColor: '#388E3C',
    selectedOptionsLabels: [],
    customNote: '',
  },
];

describe('BackgroundTaskWorkerService', () => {
  afterEach(() => {
    jest.useRealTimers();
    TestBed.resetTestingModule();
    jest.restoreAllMocks();
  });

  // Cenário: Geração de PDF e XLSX isolada via Web Worker com transferência de ArrayBuffer.
  // Objetivo: Verificar sinais de tarefa ativa, atualização de progresso em etapas e retorno binário do worker.
  it('should execute export_pdf and export_xlsx in background worker and return transferable binary bytes', async () => {
    const listeners = new Map<string, ((event: unknown) => void)[]>();
    const postMessageMock = jest.fn((request: { task: string; requestId: string }) => {
      const msgListeners = listeners.get('message') ?? [];
      queueMicrotask(() => {
        const progressMsg: BackgroundWorkerMessage = {
          type: 'progress',
          requestId: request.requestId,
          stage: 'building',
          progress: 65,
        };
        msgListeners.forEach((cb) => cb({ data: progressMsg }));

        const buffer = new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer;
        const resultMsg: BackgroundWorkerMessage = {
          type: 'result',
          requestId: request.requestId,
          task: request.task === 'export_pdf' ? 'export_pdf' : 'export_xlsx',
          buffer,
        };
        msgListeners.forEach((cb) => cb({ data: resultMsg }));
      });
    });

    const fakeWorker = {
      postMessage: postMessageMock,
      terminate: jest.fn(),
      addEventListener: jest.fn((type: string, cb: (event: unknown) => void) => {
        listeners.set(type, [...(listeners.get(type) ?? []), cb]);
      }),
      removeEventListener: jest.fn((type: string, cb: (event: unknown) => void) => {
        listeners.set(
          type,
          (listeners.get(type) ?? []).filter((entry) => entry !== cb),
        );
      }),
    } as unknown as Worker;

    TestBed.configureTestingModule({
      providers: [
        BackgroundTaskWorkerService,
        { provide: BACKGROUND_TASK_WORKER_FACTORY, useValue: () => fakeWorker },
      ],
    });

    const service = TestBed.inject(BackgroundTaskWorkerService);

    const pdfPromise = service.generatePdfBytes(
      MOCK_SCHEMA,
      MOCK_ROWS,
      MOCK_TEXTS,
      'classic',
      'report.pdf',
      { minDisplayMs: 0, startDelayMs: 0, completionDelayMs: 0 },
    );
    expect(service.isProcessing()).toBe(true);
    expect(service.taskKind()).toBe('export_pdf');
    expect(service.fileName()).toBe('report.pdf');

    const pdfOutcome = await pdfPromise;
    expect(service.isProcessing()).toBe(false);
    expect(service.isCompleted()).toBe(false);
    expect(service.taskKind()).toBeNull();
    expect(pdfOutcome?.processedInWorker).toBe(true);
    expect(Array.from(pdfOutcome?.bytes ?? [])).toEqual([0x25, 0x50, 0x44, 0x46]);

    const xlsxOutcome = await service.generateXlsxBytes(
      MOCK_SCHEMA,
      MOCK_ROWS,
      MOCK_TEXTS,
      'classic',
      {
        itemHeader: 'Item',
        valueHeader: 'Value',
        legendTitle: 'Legend',
        layoutLabel: 'Classic',
      },
      'report.xlsx',
      { minDisplayMs: 0, startDelayMs: 0, completionDelayMs: 0 },
    );
    expect(xlsxOutcome.processedInWorker).toBe(true);
    expect(xlsxOutcome.bytes.byteLength).toBe(4);
    expect(postMessageMock).toHaveBeenCalledTimes(2);
  });

  // Cenário: Fallback automático em memória para XLSX, CSV e PDF quando Worker retorna null.
  // Objetivo: Garantir que PDF devolva null para o loader local e XLSX/CSV gerem conteúdo completo em memória sem travar.
  it('should fall back gracefully in memory for xlsx/csv and return null for pdf when worker is unavailable', async () => {
    TestBed.configureTestingModule({
      providers: [
        BackgroundTaskWorkerService,
        { provide: BACKGROUND_TASK_WORKER_FACTORY, useValue: () => null },
      ],
    });

    const service = TestBed.inject(BackgroundTaskWorkerService);

    const pdfOutcome = await service.generatePdfBytes(
      MOCK_SCHEMA,
      MOCK_ROWS,
      MOCK_TEXTS,
      'modern',
      'fallback.pdf',
    );
    expect(pdfOutcome).toBeNull();

    const xlsxOutcome = await service.generateXlsxBytes(
      MOCK_SCHEMA,
      MOCK_ROWS,
      MOCK_TEXTS,
      'modern',
      {
        itemHeader: 'Practice',
        valueHeader: 'Answer',
        legendTitle: 'Legend',
        layoutLabel: 'Modern',
      },
      'fallback.xlsx',
    );
    expect(xlsxOutcome.processedInWorker).toBe(false);
    expect(xlsxOutcome.bytes[0]).toBe(0x50);
    expect(xlsxOutcome.bytes[1]).toBe(0x4b);

    const csvOutcome = await service.generateCsvContent(MOCK_ROWS, 'fallback.csv');
    expect(csvOutcome.processedInWorker).toBe(false);
    expect(csvOutcome.textContent.startsWith('\uFEFF')).toBe(true);
    expect(csvOutcome.textContent).toContain('item_rope');
  });

  // Cenário: Ciclo visual completo com delay inicial, progresso virtual contínuo e confirmação final em 100%.
  // Objetivo: Garantir que o overlay abra antes da tarefa iniciar (`startDelayMs`), evolua progressivamente em `virtual` até o teto e permaneça em `isCompleted` durante `completionDelayMs`.
  it('should honor startDelayMs, smooth virtual progress ticks, and completionDelayMs before closing', async () => {
    jest.useFakeTimers();

    TestBed.configureTestingModule({
      providers: [
        BackgroundTaskWorkerService,
        { provide: BACKGROUND_TASK_WORKER_FACTORY, useValue: () => null },
        {
          provide: BACKGROUND_TASK_TIMING_CONFIG,
          useValue: {
            startDelayMs: 200,
            minProcessingMs: 300,
            completionDelayMs: 250,
            progressTickMs: 50,
            virtualProgressCap: 92,
          },
        },
      ],
    });

    const service = TestBed.inject(BackgroundTaskWorkerService);
    const workSpy = jest.fn(async () => 'done-png');

    const taskPromise = service.runTrackedTask({
      kind: 'export_png',
      fileName: 'snapshot.png',
      initialStage: 'preparing',
      options: { progressMode: 'virtual' },
      run: workSpy,
    });

    // Logo ao disparar: overlay ativo com progresso inicial, trabalho ainda aguardando o delay inicial
    expect(service.isProcessing()).toBe(true);
    expect(service.isCompleted()).toBe(false);
    expect(service.progressMode()).toBe('virtual');
    expect(workSpy).not.toHaveBeenCalled();

    // Avança parte do delay inicial: barra virtual já progride visualmente
    await jest.advanceTimersByTimeAsync(150);
    expect(workSpy).not.toHaveBeenCalled();
    expect(service.progress()).toBeGreaterThan(8);
    expect(service.progress()).toBeLessThanOrEqual(92);

    // Cruza os 200ms de delay inicial: trabalho é iniciado
    await jest.advanceTimersByTimeAsync(60);
    expect(workSpy).toHaveBeenCalledTimes(1);

    // Avança durante minProcessingMs (~300ms a partir de 200ms): barra continua até próximo ao teto virtual
    await jest.advanceTimersByTimeAsync(280);
    expect(service.isCompleted()).toBe(false);
    expect(service.progress()).toBeLessThanOrEqual(92);

    // Ao completar o processamento mínimo, entra na janela de confirmação em 100% (`completionDelayMs`)
    await jest.advanceTimersByTimeAsync(50);
    expect(service.isProcessing()).toBe(true);
    expect(service.isCompleted()).toBe(true);
    expect(service.stage()).toBe('complete');
    expect(service.progress()).toBe(100);

    // Após finalizar o `completionDelayMs`, o overlay fecha limpamente
    await jest.advanceTimersByTimeAsync(260);
    const result = await taskPromise;
    expect(result).toBe('done-png');
    expect(service.isProcessing()).toBe(false);
    expect(service.isCompleted()).toBe(false);
    expect(service.taskKind()).toBeNull();
  });

  // Cenário: Comparação entre modo sincronizado estrito e modo híbrido + omissão de pausa final quando validação falha.
  // Objetivo: Confirmar que `synchronized` segue apenas marcos reais sem deriva virtual e que falha cancela o dwell de conclusão.
  it('should strictly follow checkpoints in synchronized mode and skip completion delay on failed validation', async () => {
    jest.useFakeTimers();

    TestBed.configureTestingModule({
      providers: [
        BackgroundTaskWorkerService,
        { provide: BACKGROUND_TASK_WORKER_FACTORY, useValue: () => null },
      ],
    });

    const service = TestBed.inject(BackgroundTaskWorkerService);
    const observedDuringRun: number[] = [];

    const syncPromise = service.runTrackedTask({
      kind: 'export_csv',
      fileName: 'synced.csv',
      options: {
        progressMode: 'synchronized',
        startDelayMs: 0,
        minDisplayMs: 0,
        completionDelayMs: 100,
      },
      shouldShowCompletion: () => true,
      run: async (reportProgress) => {
        reportProgress('preparing', 25);
        observedDuringRun.push(service.progress());
        await new Promise((r) => setTimeout(r, 80));
        // Sem deriva virtual entre marcos sincronizados
        observedDuringRun.push(service.progress());
        reportProgress('packaging', 70);
        observedDuringRun.push(service.progress());
        return 'csv-ok';
      },
    });

    await jest.advanceTimersByTimeAsync(85);
    expect(observedDuringRun).toEqual([25, 25, 70]);
    expect(service.isCompleted()).toBe(true);
    expect(service.progress()).toBe(100);

    await jest.advanceTimersByTimeAsync(110);
    await expect(syncPromise).resolves.toBe('csv-ok');

    // Quando `shouldShowCompletion` retorna false, não deve permanecer em estado concluído
    const failResult = await service.runTrackedTask({
      kind: 'export_png',
      fileName: 'failed.png',
      options: {
        progressMode: 'synchronized',
        startDelayMs: 0,
        minDisplayMs: 0,
        completionDelayMs: 300,
      },
      shouldShowCompletion: () => false,
      run: async (reportProgress) => {
        reportProgress('rendering', 45);
        return false;
      },
    });

    expect(failResult).toBe(false);
    expect(service.isProcessing()).toBe(false);
    expect(service.isCompleted()).toBe(false);
  });

  // Cenário: Cálculo proporcional dos delays a partir da configuração de ambiente (`workerLoading`).
  // Objetivo: Garantir que o padrão de 3000ms distribua start/processing/completion mantendo a soma exata e aceite 0ms ou janelas menores.
  it('should resolve proportional timing windows from environment.workerLoading (3000ms default, custom, and zero)', () => {
    expect(
      resolveEnvironmentTimingConfig({
        totalDelayMs: 3000,
        startDelayMs: 350,
        completionDelayMs: 650,
        progressTickMs: 40,
        virtualProgressCap: 92,
      }),
    ).toEqual({
      startDelayMs: 350,
      minProcessingMs: 2000,
      completionDelayMs: 650,
      progressTickMs: 40,
      virtualProgressCap: 92,
    });

    const compact = resolveEnvironmentTimingConfig({
      totalDelayMs: 500,
      startDelayMs: 350,
      completionDelayMs: 650,
      progressTickMs: 40,
      virtualProgressCap: 92,
    });
    expect(compact.startDelayMs).toBe(125);
    expect(compact.completionDelayMs).toBe(175);
    expect(compact.minProcessingMs).toBe(200);
    expect(compact.startDelayMs + compact.minProcessingMs + compact.completionDelayMs).toBe(500);

    expect(
      resolveEnvironmentTimingConfig({
        totalDelayMs: 0,
        startDelayMs: 350,
        completionDelayMs: 650,
        progressTickMs: 40,
        virtualProgressCap: 92,
      }),
    ).toEqual({
      startDelayMs: 0,
      minProcessingMs: 0,
      completionDelayMs: 0,
      progressTickMs: 40,
      virtualProgressCap: 92,
    });
  });

  // Cenário: Tarefa rápida encerrando antes do término do `minProcessingMs` configurado.
  // Objetivo: Segurar o progresso ativo no teto (`virtualProgressCap`) antes de liberar 100% e `isCompleted`.
  it('should cap synchronized completion at virtualProgressCap while waiting out minProcessingMs', async () => {
    jest.useFakeTimers();

    TestBed.configureTestingModule({
      providers: [
        BackgroundTaskWorkerService,
        { provide: BACKGROUND_TASK_WORKER_FACTORY, useValue: () => null },
      ],
    });

    const service = TestBed.inject(BackgroundTaskWorkerService);
    const runPromise = service.runTrackedTask({
      kind: 'export_xlsx',
      fileName: 'fast.xlsx',
      options: {
        progressMode: 'synchronized',
        startDelayMs: 0,
        minDisplayMs: 300,
        completionDelayMs: 100,
      },
      run: async (reportProgress) => {
        reportProgress('complete', 100);
        return 'ok';
      },
    });

    // Logo após execução instantânea, aguarda `minProcessingMs` limitado ao cap (92%) sem marcar concluído
    await jest.advanceTimersByTimeAsync(150);
    expect(service.isProcessing()).toBe(true);
    expect(service.isCompleted()).toBe(false);
    expect(service.stage()).toBe('packaging');
    expect(service.progress()).toBe(92);

    // Após cruzar os 300ms de processamento mínimo, entra na confirmação final de 100%
    await jest.advanceTimersByTimeAsync(170);
    expect(service.isCompleted()).toBe(true);
    expect(service.stage()).toBe('complete');
    expect(service.progress()).toBe(100);

    await jest.advanceTimersByTimeAsync(120);
    await expect(runPromise).resolves.toBe('ok');
  });
});
