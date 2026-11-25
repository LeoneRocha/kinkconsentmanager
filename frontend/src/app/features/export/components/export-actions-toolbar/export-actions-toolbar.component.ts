import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ExportFormat } from '../../../../core/models';

/**
 * Presentational action toolbar providing visual/data export triggers and JSON draft import.
 */
@Component({
  selector: 'app-export-actions-toolbar',
  imports: [MatButtonModule],
  templateUrl: './export-actions-toolbar.component.html',
  styleUrl: './export-actions-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportActionsToolbarComponent {
  readonly busyFormat = input<ExportFormat | null>(null);
  readonly hasSchema = input<boolean>(false);
  readonly exportReady = input<boolean>(true);

  readonly backLabel = input<string>('Voltar ao Checklist');
  readonly pngLabel = input<string>('Baixar PNG');
  readonly pdfLabel = input<string>('Baixar PDF');
  readonly printLabel = input<string>('Imprimir');
  readonly jsonLabel = input<string>('Exportar JSON');
  readonly importJsonLabel = input<string>('Importar JSON');
  readonly csvLabel = input<string>('Exportar CSV');
  readonly xlsxLabel = input<string>('Exportar XLSX');

  readonly backToChecklist = output<void>();
  readonly exportPng = output<void>();
  readonly exportPdf = output<void>();
  readonly printChecklist = output<void>();
  readonly exportJson = output<void>();
  readonly importJsonFile = output<File>();
  readonly exportCsv = output<void>();
  readonly exportXlsx = output<void>();

  private readonly jsonFileInput = viewChild<ElementRef<HTMLInputElement>>('jsonFileInput');

  protected readonly isBusy = computed<boolean>(() => this.busyFormat() !== null);
  protected readonly actionsDisabled = computed<boolean>(() => !this.hasSchema() || this.isBusy());
  protected readonly exportActionsDisabled = computed<boolean>(
    () => !this.hasSchema() || !this.exportReady() || this.isBusy(),
  );

  protected onBackClick(): void {
    this.backToChecklist.emit();
  }

  protected onExportPngClick(): void {
    if (this.exportActionsDisabled()) {
      return;
    }
    this.exportPng.emit();
  }

  protected onExportPdfClick(): void {
    if (this.exportActionsDisabled()) {
      return;
    }
    this.exportPdf.emit();
  }

  protected onPrintClick(): void {
    if (this.exportActionsDisabled()) {
      return;
    }
    this.printChecklist.emit();
  }

  protected onExportJsonClick(): void {
    if (this.exportActionsDisabled()) {
      return;
    }
    this.exportJson.emit();
  }

  protected onImportJsonTriggerClick(): void {
    if (this.actionsDisabled()) {
      return;
    }
    this.jsonFileInput()?.nativeElement.click();
  }

  protected onExportCsvClick(): void {
    if (this.exportActionsDisabled()) {
      return;
    }
    this.exportCsv.emit();
  }

  protected onExportXlsxClick(): void {
    if (this.exportActionsDisabled()) {
      return;
    }
    this.exportXlsx.emit();
  }

  protected onFileSelected(event: Event): void {
    const inputElement = event.target as HTMLInputElement | null;
    const selectedFile = inputElement?.files?.[0];
    if (selectedFile) {
      this.importJsonFile.emit(selectedFile);
    }
    if (inputElement) {
      inputElement.value = '';
    }
  }
}
