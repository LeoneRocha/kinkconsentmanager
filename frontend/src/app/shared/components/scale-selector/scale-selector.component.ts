import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  viewChildren,
} from '@angular/core';
import {
  getScaleAnswerValue,
  resolveOrderedScales,
  resolveScaleLabel,
  ScaleId,
  ScaleOption,
} from '../../../core/models';

@Component({
  selector: 'app-scale-selector',
  templateUrl: './scale-selector.component.html',
  styleUrl: './scale-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScaleSelectorComponent {
  readonly scales = input.required<readonly ScaleOption[]>();
  readonly scaleLabels = input.required<Readonly<Record<string, string>>>();
  readonly roleTitle = input<string>('');
  readonly selectedScale = input<ScaleId | undefined>(undefined);
  readonly disabled = input<boolean>(false);
  readonly compact = input<boolean>(false);

  readonly scaleChange = output<ScaleId | undefined>();

  private readonly scaleButtons = viewChildren<ElementRef<HTMLButtonElement>>('scaleBtn');

  protected readonly orderedScales = computed<readonly ScaleOption[]>(() =>
    resolveOrderedScales(this.scales()),
  );

  protected readonly focusableScaleId = computed<ScaleId | undefined>(() => {
    const ordered = this.orderedScales();
    if (ordered.length === 0) {
      return undefined;
    }
    const selected = this.selectedScale();
    if (selected !== undefined && ordered.some((scale) => this.getScaleValue(scale) === selected)) {
      return selected;
    }
    return this.getScaleValue(ordered[0]);
  });

  protected getScaleValue(scale: ScaleOption): ScaleId {
    return getScaleAnswerValue(scale);
  }

  protected getScaleLabel(scale: ScaleOption): string {
    return resolveScaleLabel(scale, this.scaleLabels());
  }

  protected isSelected(scale: ScaleOption): boolean {
    return this.selectedScale() === this.getScaleValue(scale);
  }

  protected onSelect(scale: ScaleOption): void {
    if (this.disabled()) {
      return;
    }
    const value = this.getScaleValue(scale);
    const nextValue = this.selectedScale() === value ? undefined : value;
    this.scaleChange.emit(nextValue);
  }

  protected onKeydown(event: KeyboardEvent, index: number): void {
    if (this.disabled()) {
      return;
    }

    const buttons = this.scaleButtons();
    if (buttons.length === 0) {
      return;
    }

    let targetIndex: number | null = null;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        targetIndex = (index + 1) % buttons.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        targetIndex = (index - 1 + buttons.length) % buttons.length;
        break;
      case 'Home':
        targetIndex = 0;
        break;
      case 'End':
        targetIndex = buttons.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    buttons[targetIndex]?.nativeElement.focus();
  }
}
