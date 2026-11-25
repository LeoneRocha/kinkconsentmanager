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
 * Presentational section card providing portable JSON draft export and import (backup & restore).
 */
@Component({
  selector: 'app-export-backup-restore',
  imports: [MatButtonModule],
  templateUrl: './export-backup-restore.component.html',
  styleUrl: './export-backup-restore.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportBackupRestoreComponent {
  readonly busyFormat = input<ExportFormat | null>(null);
  readonly hasSchema = input<boolean>(false);
  readonly sectionLabel = input<string>('3. Backup e Restore');
  readonly jsonLabel = input<string>('Exportar JSON');
  readonly importJsonLabel = input<string>('Importar JSON');

  readonly exportJson = output<void>();
  readonly importJsonFile = output<File>();

  private readonly jsonFileInput = viewChild<ElementRef<HTMLInputElement>>('jsonFileInput');

  protected readonly isBusy = computed<boolean>(() => this.busyFormat() !== null);
  protected readonly actionsDisabled = computed<boolean>(() => !this.hasSchema() || this.isBusy());

  protected onExportJsonClick(): void {
    if (this.actionsDisabled()) {
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
