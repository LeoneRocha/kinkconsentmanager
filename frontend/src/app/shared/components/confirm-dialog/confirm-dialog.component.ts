import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmDialogData {
  readonly header: string;
  readonly message: string;
  readonly icon?: string;
  readonly acceptLabel: string;
  readonly rejectLabel: string;
  readonly danger?: boolean;
}

/**
 * Reusable Material confirmation dialog returning true on accept or false on cancel.
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent, boolean>);

  protected onReject(): void {
    this.dialogRef.close(false);
  }

  protected onAccept(): void {
    this.dialogRef.close(true);
  }
}
