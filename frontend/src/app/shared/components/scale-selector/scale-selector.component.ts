import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  viewChildren,
} from '@angular/core';
import { ScaleId, ScaleOption } from '../../../core/models';

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
    [...this.scales()].sort((a, b) => a.order - b.order),
  );

  protected readonly focusableScaleId = computed<ScaleId | undefined>(() => {
    const ordered = this.orderedScales();
    if (ordered.length === 0) {
      return undefined;
    }
    const selected = this.selectedScale();
    if (selected !== undefined && ordered.some((scale) => scale.id === selected)) {
      return selected;
    }
    return ordered[0].id;
  });

  protected getScaleLabel(scale: ScaleOption): string {
    return this.scaleLabels()[scale.id] ?? scale.id;
  }

  protected isSelected(scaleId: ScaleId): boolean {
    return this.selectedScale() === scaleId;
  }

  protected onSelect(scaleId: ScaleId): void {
    if (this.disabled()) {
      return;
    }
    const nextValue = this.selectedScale() === scaleId ? undefined : scaleId;
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
