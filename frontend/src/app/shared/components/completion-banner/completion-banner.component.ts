import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

/**
 * Reusable presentational status banner displayed when a flow or checklist reaches completion,
 * with configurable secondary (review) and primary (export/continue) actions.
 */
@Component({
  selector: 'app-completion-banner',
  imports: [MatButtonModule],
  templateUrl: './completion-banner.component.html',
  styleUrl: './completion-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompletionBannerComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly icon = input<string>('fa-solid fa-circle-check');

  readonly secondaryActionLabel = input<string | null>(null);
  readonly secondaryActionIcon = input<string>('fa-solid fa-list-check');
  readonly secondaryActionId = input<string>('review-checklist');
  readonly showSecondaryAction = input<boolean>(true);

  readonly primaryActionLabel = input<string | null>(null);
  readonly primaryActionIcon = input<string>('fa-solid fa-file-export');
  readonly primaryActionId = input<string>('export-checklist');

  readonly secondaryAction = output<void>();
  readonly primaryAction = output<void>();
}
