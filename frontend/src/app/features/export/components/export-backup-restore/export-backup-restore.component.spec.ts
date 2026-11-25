import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExportBackupRestoreComponent } from './export-backup-restore.component';

describe('ExportBackupRestoreComponent', () => {
  let fixture: ComponentFixture<ExportBackupRestoreComponent>;
  let component: ExportBackupRestoreComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExportBackupRestoreComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExportBackupRestoreComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('hasSchema', true);
    fixture.componentRef.setInput('busyFormat', null);
    await fixture.whenStable();
  });

  it('should render json export and import actions and enable them when schema is ready', () => {
    const hostEl = fixture.nativeElement as HTMLElement;
    const jsonBtn = hostEl.querySelector<HTMLButtonElement>('button[data-action="json"]')!;
    const importBtn = hostEl.querySelector<HTMLButtonElement>('button[data-action="import-json"]')!;

    expect(jsonBtn).not.toBeNull();
    expect(importBtn).not.toBeNull();
    expect(jsonBtn.disabled).toBe(false);
    expect(importBtn.disabled).toBe(false);
    expect(jsonBtn.classList.contains('export-backup__btn--ready')).toBe(true);
    expect(importBtn.classList.contains('export-backup__btn--ready')).toBe(true);
  });

  it('should disable both actions when hasSchema is false or busyFormat is set', async () => {
    fixture.componentRef.setInput('hasSchema', false);
    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;
    const jsonBtn = hostEl.querySelector<HTMLButtonElement>('button[data-action="json"]')!;
    const importBtn = hostEl.querySelector<HTMLButtonElement>('button[data-action="import-json"]')!;
    expect(jsonBtn.disabled).toBe(true);
    expect(importBtn.disabled).toBe(true);
    expect(jsonBtn.classList.contains('export-backup__btn--ready')).toBe(false);

    fixture.componentRef.setInput('hasSchema', true);
    fixture.componentRef.setInput('busyFormat', 'json');
    await fixture.whenStable();

    expect(jsonBtn.disabled).toBe(true);
    expect(importBtn.disabled).toBe(true);
    expect(jsonBtn.getAttribute('aria-busy')).toBe('true');
    expect(jsonBtn.querySelector('i')?.className).toContain('fa-spinner');
  });

  it('should emit exportJson on click and emit selected File while resetting hidden input', () => {
    const hostEl = fixture.nativeElement as HTMLElement;
    const jsonSpy = jest.fn<void, []>();
    component.exportJson.subscribe(jsonSpy);

    hostEl.querySelector<HTMLButtonElement>('button[data-action="json"]')?.click();
    expect(jsonSpy).toHaveBeenCalledTimes(1);

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
});
