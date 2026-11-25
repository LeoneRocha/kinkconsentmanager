import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ExportFormat } from '../../../../core/models';
import { SchemaTranslatePipe } from '../../../../shared/pipes';

/**
 * Presentational action toolbar providing navigation back to checklist and visual/spreadsheet exports.
 */
@Component({
  selector: 'app-export-actions-toolbar',
  imports: [MatButtonModule, SchemaTranslatePipe],
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
  readonly csvLabel = input<string>('Exportar CSV');
  readonly xlsxLabel = input<string>('Exportar XLSX');

  readonly backToChecklist = output<void>();
  readonly exportPng = output<void>();
  readonly exportPdf = output<void>();
  readonly printChecklist = output<void>();
  readonly exportCsv = output<void>();
  readonly exportXlsx = output<void>();

  protected readonly isBusy = computed<boolean>(() => this.busyFormat() !== null);
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
}
