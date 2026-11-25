import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExportActionsToolbarComponent } from './export-actions-toolbar.component';

describe('ExportActionsToolbarComponent', () => {
  let fixture: ComponentFixture<ExportActionsToolbarComponent>;
  let component: ExportActionsToolbarComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExportActionsToolbarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExportActionsToolbarComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('hasSchema', true);
    fixture.componentRef.setInput('busyFormat', null);
    await fixture.whenStable();
  });

  it('should render all 8 toolbar actions including XLSX export', () => {
    const hostEl = fixture.nativeElement as HTMLElement;
    const buttons = hostEl.querySelectorAll<HTMLButtonElement>('button[data-action]');
    const actions = Array.from(buttons).map((btn) => btn.dataset['action']);

    expect(actions).toEqual(['back', 'png', 'pdf', 'print', 'json', 'import-json', 'csv', 'xlsx']);
  });

  it('should disable export and import actions when hasSchema is false while keeping back enabled', async () => {
    fixture.componentRef.setInput('hasSchema', false);
    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;
    const backBtn = hostEl.querySelector<HTMLButtonElement>('button[data-action="back"]')!;
    const pngBtn = hostEl.querySelector<HTMLButtonElement>('button[data-action="png"]')!;
    const pdfBtn = hostEl.querySelector<HTMLButtonElement>('button[data-action="pdf"]')!;
    const printBtn = hostEl.querySelector<HTMLButtonElement>('button[data-action="print"]')!;
    const jsonBtn = hostEl.querySelector<HTMLButtonElement>('button[data-action="json"]')!;
    const importBtn = hostEl.querySelector<HTMLButtonElement>('button[data-action="import-json"]')!;
    const csvBtn = hostEl.querySelector<HTMLButtonElement>('button[data-action="csv"]')!;
    const xlsxBtn = hostEl.querySelector<HTMLButtonElement>('button[data-action="xlsx"]')!;

    expect(backBtn.disabled).toBe(false);
    expect(pngBtn.disabled).toBe(true);
    expect(pdfBtn.disabled).toBe(true);
    expect(printBtn.disabled).toBe(true);
    expect(jsonBtn.disabled).toBe(true);
    expect(importBtn.disabled).toBe(true);
    expect(csvBtn.disabled).toBe(true);
    expect(xlsxBtn.disabled).toBe(true);
  });

  it('should disable actions and show busy spinner for the active busyFormat', async () => {
    fixture.componentRef.setInput('busyFormat', 'pdf');
    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;
    const pdfBtn = hostEl.querySelector<HTMLButtonElement>('button[data-action="pdf"]')!;
    const pngBtn = hostEl.querySelector<HTMLButtonElement>('button[data-action="png"]')!;

    expect(pdfBtn.disabled).toBe(true);
    expect(pngBtn.disabled).toBe(true);
    expect(pdfBtn.getAttribute('aria-busy')).toBe('true');
    expect(pdfBtn.querySelector('i')?.className).toContain('fa-spinner');
  });

  it('should emit action outputs when toolbar buttons are clicked', () => {
    const emitted: string[] = [];
    component.backToChecklist.subscribe(() => emitted.push('back'));
    component.exportPng.subscribe(() => emitted.push('png'));
    component.exportPdf.subscribe(() => emitted.push('pdf'));
    component.printChecklist.subscribe(() => emitted.push('print'));
    component.exportJson.subscribe(() => emitted.push('json'));
    component.exportCsv.subscribe(() => emitted.push('csv'));
    component.exportXlsx.subscribe(() => emitted.push('xlsx'));

    const hostEl = fixture.nativeElement as HTMLElement;
    hostEl.querySelector<HTMLButtonElement>('button[data-action="back"]')?.click();
    hostEl.querySelector<HTMLButtonElement>('button[data-action="png"]')?.click();
    hostEl.querySelector<HTMLButtonElement>('button[data-action="pdf"]')?.click();
    hostEl.querySelector<HTMLButtonElement>('button[data-action="print"]')?.click();
    hostEl.querySelector<HTMLButtonElement>('button[data-action="json"]')?.click();
    hostEl.querySelector<HTMLButtonElement>('button[data-action="csv"]')?.click();
    hostEl.querySelector<HTMLButtonElement>('button[data-action="xlsx"]')?.click();

    expect(emitted).toEqual(['back', 'png', 'pdf', 'print', 'json', 'csv', 'xlsx']);
  });

  it('should trigger hidden file input on import click, emit selected File, and reset input value', () => {
    const hostEl = fixture.nativeElement as HTMLElement;
    const fileInput = hostEl.querySelector<HTMLInputElement>('input[type="file"]')!;
    const clickSpy = jest.spyOn(fileInput, 'click').mockImplementation(() => {});

    expect(fileInput.accept).toBe('.json,application/json');

    hostEl.querySelector<HTMLButtonElement>('button[data-action="import-json"]')?.click();
    expect(clickSpy).toHaveBeenCalledTimes(1);

    const importedFiles: File[] = [];
    component.importJsonFile.subscribe((file) => importedFiles.push(file));

    const mockFile = new File(['{"schemaVersion":"1.0.0"}'], 'draft.json', {
      type: 'application/json',
    });
    const mockFileList: FileList = {
      0: mockFile,
      length: 1,
      item: (index: number) => (index === 0 ? mockFile : null),
      [Symbol.iterator]: () => [mockFile].values(),
    };
    Object.defineProperty(fileInput, 'files', {
      value: mockFileList,
      configurable: true,
    });

    fileInput.dispatchEvent(new Event('change'));

    expect(importedFiles).toEqual([mockFile]);
    expect(fileInput.value).toBe('');
  });

  it('should disable visual exports until exportReady is true while keeping json draft export/import and back enabled', async () => {
    fixture.componentRef.setInput('exportReady', false);
    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;
    const visualExportActions = ['png', 'pdf', 'print', 'csv', 'xlsx'];
    for (const action of visualExportActions) {
      const btn = hostEl.querySelector<HTMLButtonElement>(`button[data-action="${action}"]`)!;
      expect(btn.disabled).toBe(true);
      expect(btn.classList.contains('export-toolbar__btn--ready')).toBe(false);
    }

    const jsonBtn = hostEl.querySelector<HTMLButtonElement>('button[data-action="json"]')!;
    expect(jsonBtn.disabled).toBe(false);
    expect(jsonBtn.classList.contains('export-toolbar__btn--ready')).toBe(true);

    expect(hostEl.querySelector<HTMLButtonElement>('button[data-action="back"]')!.disabled).toBe(
      false,
    );
    expect(
      hostEl.querySelector<HTMLButtonElement>('button[data-action="import-json"]')!.disabled,
    ).toBe(false);

    fixture.componentRef.setInput('exportReady', true);
    await fixture.whenStable();

    for (const action of visualExportActions) {
      const btn = hostEl.querySelector<HTMLButtonElement>(`button[data-action="${action}"]`)!;
      expect(btn.disabled).toBe(false);
      expect(btn.classList.contains('export-toolbar__btn--ready')).toBe(true);
    }
  });
});
