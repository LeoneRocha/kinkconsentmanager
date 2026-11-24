import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChecklistProgressBarComponent } from './checklist-progress-bar.component';

describe('ChecklistProgressBarComponent', () => {
  let fixture: ComponentFixture<ChecklistProgressBarComponent>;
  let component: ChecklistProgressBarComponent;

  const setBaseInputs = async (overrides?: {
    answeredCount?: number;
    totalCount?: number;
    progressPercentage?: number;
    autosaveText?: string;
    isAutosaving?: boolean;
    hasUnsavedChanges?: boolean;
    autosaveEnabled?: boolean;
  }): Promise<void> => {
    fixture.componentRef.setInput('answeredCount', overrides?.answeredCount ?? 0);
    fixture.componentRef.setInput('totalCount', overrides?.totalCount ?? 10);
    fixture.componentRef.setInput('progressPercentage', overrides?.progressPercentage ?? 0);
    if (overrides?.autosaveText !== undefined) {
      fixture.componentRef.setInput('autosaveText', overrides.autosaveText);
    }
    if (overrides?.isAutosaving !== undefined) {
      fixture.componentRef.setInput('isAutosaving', overrides.isAutosaving);
    }
    if (overrides?.hasUnsavedChanges !== undefined) {
      fixture.componentRef.setInput('hasUnsavedChanges', overrides.hasUnsavedChanges);
    }
    if (overrides?.autosaveEnabled !== undefined) {
      fixture.componentRef.setInput('autosaveEnabled', overrides.autosaveEnabled);
    }
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChecklistProgressBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChecklistProgressBarComponent);
    component = fixture.componentInstance;
    await setBaseInputs();
  });

  // Cenário: Renderização do indicador de progresso com valores iniciais.
  // Objetivo: Garantir que app-progress-indicator exiba contagem, porcentagem e rótulo esperados.
  it('should render progress indicator with answeredCount, totalCount, percentage, and label', async () => {
    await setBaseInputs({ answeredCount: 5, totalCount: 20, progressPercentage: 25 });

    const hostEl = fixture.nativeElement as HTMLElement;
    const progress = hostEl.querySelector('app-progress-indicator');
    expect(progress).not.toBeNull();
    expect(progress?.textContent).toContain('Progresso');
    expect(progress?.textContent).toContain('5 / 20 (25%)');
  });

  // Cenário: Estados do botão Salvar (limpo, sujo e salvando).
  // Objetivo: Validar desabilitação quando limpo, destaque verde e emissão de saveNow quando sujo, e spinner durante salvamento.
  it('should disable Save button when clean, enable green button when dirty, show spinner while saving, and emit saveNow', async () => {
    await setBaseInputs({
      autosaveText: 'Salvo às 21:28',
      hasUnsavedChanges: false,
      isAutosaving: false,
    });
    const saveSpy = jest.fn<void, []>();
    component.saveNow.subscribe(saveSpy);

    const hostEl = fixture.nativeElement as HTMLElement;
    const saveBtn = hostEl.querySelector<HTMLButtonElement>('.checklist-progress-bar__save-btn')!;
    expect(saveBtn.textContent).toContain('Salvar');
    expect(saveBtn.disabled).toBe(true);
    expect(saveBtn.classList.contains('checklist-progress-bar__save-btn--dirty')).toBe(false);

    await setBaseInputs({
      autosaveText: 'Salvo às 21:28',
      hasUnsavedChanges: true,
      isAutosaving: false,
    });
    expect(saveBtn.disabled).toBe(false);
    expect(saveBtn.classList.contains('checklist-progress-bar__save-btn--dirty')).toBe(true);

    saveBtn.click();
    await fixture.whenStable();
    expect(saveSpy).toHaveBeenCalledTimes(1);

    await setBaseInputs({
      hasUnsavedChanges: true,
      isAutosaving: true,
    });
    expect(saveBtn.disabled).toBe(true);
    expect(saveBtn.querySelector('i.fa-spinner.fa-spin')).not.toBeNull();
  });

  // Cenário: Bloqueio e liberação do botão Exportar conforme conclusão do checklist.
  // Objetivo: Garantir que Exportar fique desabilitado até answeredCount >= totalCount e emita goToExport quando concluído.
  it('should gate Export button until checklist is complete, turn green when ready, and emit goToExport', async () => {
    await setBaseInputs({ answeredCount: 1, totalCount: 2 });
    const exportSpy = jest.fn<void, []>();
    component.goToExport.subscribe(exportSpy);

    const hostEl = fixture.nativeElement as HTMLElement;
    const exportBtn = hostEl.querySelector<HTMLButtonElement>(
      '.checklist-progress-bar__export-btn',
    )!;
    expect(exportBtn.disabled).toBe(true);
    expect(exportBtn.classList.contains('checklist-progress-bar__export-btn--ready')).toBe(false);

    await setBaseInputs({ answeredCount: 2, totalCount: 2 });
    expect(exportBtn.disabled).toBe(false);
    expect(exportBtn.classList.contains('checklist-progress-bar__export-btn--ready')).toBe(true);

    exportBtn.click();
    await fixture.whenStable();
    expect(exportSpy).toHaveBeenCalledTimes(1);
  });

  // Cenário: Alternância do switch de salvamento automático e leitura do texto de status.
  // Objetivo: Garantir emissão de autosaveEnabledChange e exibição de autosaveText em .checklist-progress-bar__save-meta.
  it('should emit autosaveEnabledChange on toggle and display autosaveText in status pill', async () => {
    await setBaseInputs({ autosaveText: 'Salvo às 13:05', autosaveEnabled: true });
    const toggleSpy = jest.fn<void, [boolean]>();
    component.autosaveEnabledChange.subscribe(toggleSpy);

    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelector('.checklist-progress-bar__save-meta')?.textContent).toContain(
      'Salvo às 13:05',
    );

    const toggleBtn = hostEl.querySelector<HTMLButtonElement>(
      '.checklist-progress-bar__autosave-toggle button[role="switch"]',
    );
    expect(toggleBtn).not.toBeNull();

    toggleBtn!.click();
    await fixture.whenStable();
    expect(toggleSpy).toHaveBeenCalledWith(false);
  });

  // Cenário: Alternância do modo compacto pelo botão no topo direito ao lado da barra de progresso.
  // Objetivo: Garantir posicionamento após app-progress-indicator e ocultação da trilha de passos e legenda quando ativo.
  it('should toggle compact mode via button beside progress indicator at top-right, hiding rail and legend while keeping progress bar visible', async () => {
    const hostEl = fixture.nativeElement as HTMLElement;
    const sectionEl = hostEl.querySelector('section.checklist-progress-bar')!;
    const progressRow = hostEl.querySelector<HTMLElement>('.checklist-progress-bar__progress')!;
    const saveActionsRow = hostEl.querySelector<HTMLElement>(
      '.checklist-progress-bar__save-actions',
    )!;
    const compactBtn = hostEl.querySelector<HTMLButtonElement>(
      '.checklist-progress-bar__compact-btn',
    )!;
    const progressIndicator = hostEl.querySelector<HTMLElement>('app-progress-indicator')!;
    const saveBtn = hostEl.querySelector<HTMLButtonElement>('.checklist-progress-bar__save-btn')!;
    const railContainer = hostEl.querySelector<HTMLElement>('.checklist-progress-bar__rail')!;
    const legendContainer = hostEl.querySelector<HTMLElement>('.checklist-progress-bar__legend')!;

    expect(compactBtn).not.toBeNull();
    expect(progressRow.contains(compactBtn)).toBe(true);
    expect(saveActionsRow.contains(compactBtn)).toBe(false);
    expect(
      Boolean(
        progressIndicator.compareDocumentPosition(compactBtn) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
    expect(compactBtn.getAttribute('aria-pressed')).toBe('false');
    expect(compactBtn.querySelector('i.fa-angles-up')).not.toBeNull();
    expect(railContainer.hidden).toBe(false);
    expect(legendContainer.hidden).toBe(false);

    compactBtn.click();
    await fixture.whenStable();

    expect(compactBtn.getAttribute('aria-pressed')).toBe('true');
    expect(compactBtn.classList.contains('checklist-progress-bar__compact-btn--active')).toBe(true);
    expect(compactBtn.querySelector('i.fa-angles-down')).not.toBeNull();
    expect(sectionEl.classList.contains('checklist-progress-bar--compact')).toBe(true);
    expect(railContainer.hidden).toBe(true);
    expect(legendContainer.hidden).toBe(true);
    expect(hostEl.querySelector('app-progress-indicator')).not.toBeNull();
    expect(saveBtn).not.toBeNull();

    compactBtn.click();
    await fixture.whenStable();

    expect(compactBtn.getAttribute('aria-pressed')).toBe('false');
    expect(sectionEl.classList.contains('checklist-progress-bar--compact')).toBe(false);
    expect(railContainer.hidden).toBe(false);
    expect(legendContainer.hidden).toBe(false);
  });
});
