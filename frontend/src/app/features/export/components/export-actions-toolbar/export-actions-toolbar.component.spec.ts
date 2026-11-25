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

  it('should render all 6 toolbar actions for navigation and checklist exports', () => {
    const hostEl = fixture.nativeElement as HTMLElement;
    const buttons = hostEl.querySelectorAll<HTMLButtonElement>('button[data-action]');
    const actions = Array.from(buttons).map((btn) => btn.dataset['action']);

    expect(actions).toEqual(['back', 'png', 'pdf', 'print', 'csv', 'xlsx']);
  });

  it('should disable export actions when hasSchema is false while keeping back enabled', async () => {
    fixture.componentRef.setInput('hasSchema', false);
    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;
    const backBtn = hostEl.querySelector<HTMLButtonElement>('button[data-action="back"]')!;
    const pngBtn = hostEl.querySelector<HTMLButtonElement>('button[data-action="png"]')!;
    const pdfBtn = hostEl.querySelector<HTMLButtonElement>('button[data-action="pdf"]')!;
    const printBtn = hostEl.querySelector<HTMLButtonElement>('button[data-action="print"]')!;
    const csvBtn = hostEl.querySelector<HTMLButtonElement>('button[data-action="csv"]')!;
    const xlsxBtn = hostEl.querySelector<HTMLButtonElement>('button[data-action="xlsx"]')!;

    expect(backBtn.disabled).toBe(false);
    expect(pngBtn.disabled).toBe(true);
    expect(pdfBtn.disabled).toBe(true);
    expect(printBtn.disabled).toBe(true);
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
    component.exportCsv.subscribe(() => emitted.push('csv'));
    component.exportXlsx.subscribe(() => emitted.push('xlsx'));

    const hostEl = fixture.nativeElement as HTMLElement;
    hostEl.querySelector<HTMLButtonElement>('button[data-action="back"]')?.click();
    hostEl.querySelector<HTMLButtonElement>('button[data-action="png"]')?.click();
    hostEl.querySelector<HTMLButtonElement>('button[data-action="pdf"]')?.click();
    hostEl.querySelector<HTMLButtonElement>('button[data-action="print"]')?.click();
    hostEl.querySelector<HTMLButtonElement>('button[data-action="csv"]')?.click();
    hostEl.querySelector<HTMLButtonElement>('button[data-action="xlsx"]')?.click();

    expect(emitted).toEqual(['back', 'png', 'pdf', 'print', 'csv', 'xlsx']);
  });

  it('should disable visual exports until exportReady is true while keeping back enabled', async () => {
    fixture.componentRef.setInput('exportReady', false);
    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;
    const visualExportActions = ['png', 'pdf', 'print', 'csv', 'xlsx'];
    for (const action of visualExportActions) {
      const btn = hostEl.querySelector<HTMLButtonElement>(`button[data-action="${action}"]`)!;
      expect(btn.disabled).toBe(true);
      expect(btn.classList.contains('export-toolbar__btn--ready')).toBe(false);
    }

    expect(hostEl.querySelector<HTMLButtonElement>('button[data-action="back"]')!.disabled).toBe(
      false,
    );

    fixture.componentRef.setInput('exportReady', true);
    await fixture.whenStable();

    for (const action of visualExportActions) {
      const btn = hostEl.querySelector<HTMLButtonElement>(`button[data-action="${action}"]`)!;
      expect(btn.disabled).toBe(false);
      expect(btn.classList.contains('export-toolbar__btn--ready')).toBe(true);
    }
  });
});
