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
});
