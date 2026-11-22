import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-progress-indicator',
  imports: [MatProgressBarModule],
  templateUrl: './progress-indicator.component.html',
  styleUrl: './progress-indicator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressIndicatorComponent {
  readonly answered = input.required<number>();
  readonly total = input.required<number>();
  readonly percentage = input.required<number>();
  readonly label = input<string>('Progresso');

  protected readonly clampedPercentage = computed<number>(() => {
    const raw = this.percentage();
    if (!Number.isFinite(raw)) {
      return 0;
    }
    return Math.min(100, Math.max(0, raw));
  });
}
