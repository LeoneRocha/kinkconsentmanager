import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ScaleOption } from '../../../core/models';
import { SchemaTranslatePipe } from '../../pipes';

@Component({
  selector: 'app-legend-bar',
  imports: [SchemaTranslatePipe],
  templateUrl: './legend-bar.component.html',
  styleUrl: './legend-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegendBarComponent {
  readonly scales = input.required<readonly ScaleOption[]>();
  readonly scaleLabels = input.required<Readonly<Record<string, string>>>();

  protected readonly orderedScales = computed<readonly ScaleOption[]>(() =>
    [...this.scales()].sort((a, b) => a.order - b.order),
  );

  protected getScaleLabel(scale: ScaleOption): string {
    return this.scaleLabels()[scale.id] ?? scale.id;
  }
}
