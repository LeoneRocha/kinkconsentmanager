import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  effect,
  inject,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { createPopper, Instance, Placement } from '@popperjs/core';
import { SchemaTranslatePipe } from '../../pipes';

export type PopperTriggerMode = 'click' | 'hover' | 'manual';

/**
 * Componente reutilizável que encapsula `@popperjs/core` para posicionamento
 * dinâmico de popovers, dropdowns e dicas sem acoplar terceiros às features.
 */
@Component({
  selector: 'app-popper-popover',
  imports: [SchemaTranslatePipe],
  templateUrl: './popper-popover.component.html',
  styleUrl: './popper-popover.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppPopperPopoverComponent {
  private readonly hostElement = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  private readonly triggerEl = viewChild<ElementRef<HTMLElement>>('triggerEl');
  private readonly panelEl = viewChild<ElementRef<HTMLElement>>('panelEl');

  private popperInstance: Instance | null = null;

  readonly placement = input<Placement>('bottom-end');
  readonly offset = input<readonly [number, number]>([0, 8]);
  readonly trigger = input<PopperTriggerMode>('click');
  readonly closeOnOutsideClick = input<boolean>(true);
  readonly closeOnEscape = input<boolean>(true);
  readonly ariaLabel = input<string>('');

  readonly isOpen = model<boolean>(false);

  readonly opened = output<void>();
  readonly closed = output<void>();

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const placement = this.placement();
      const [skidding, distance] = this.offset();
      const triggerRef = this.triggerEl()?.nativeElement;
      const panelRef = this.panelEl()?.nativeElement;

      if (!open || !triggerRef || !panelRef) {
        this.destroyPopper();
        return;
      }

      if (this.popperInstance) {
        void this.popperInstance.setOptions({
          placement,
          modifiers: [
            { name: 'offset', options: { offset: [skidding, distance] } },
            { name: 'preventOverflow', options: { padding: 8 } },
          ],
        });
        void this.popperInstance.update();
        return;
      }

      this.popperInstance = createPopper(triggerRef, panelRef, {
        placement,
        modifiers: [
          { name: 'offset', options: { offset: [skidding, distance] } },
          { name: 'preventOverflow', options: { padding: 8 } },
        ],
      });
    });

    this.destroyRef.onDestroy(() => this.destroyPopper());
  }

  open(): void {
    if (!this.isOpen()) {
      this.isOpen.set(true);
      this.opened.emit();
    }
  }

  close(): void {
    if (this.isOpen()) {
      this.isOpen.set(false);
      this.closed.emit();
    }
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  protected onTriggerClick(): void {
    if (this.trigger() === 'click') {
      this.toggle();
    }
  }

  protected onMouseEnter(): void {
    if (this.trigger() === 'hover') {
      this.open();
    }
  }

  protected onMouseLeave(): void {
    if (this.trigger() === 'hover') {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscapePressed(): void {
    if (this.isOpen() && this.closeOnEscape()) {
      this.close();
    }
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen() || !this.closeOnOutsideClick()) {
      return;
    }
    const target = event.target as Node | null;
    if (target && !this.hostElement.nativeElement.contains(target)) {
      this.close();
    }
  }

  private destroyPopper(): void {
    if (this.popperInstance) {
      this.popperInstance.destroy();
      this.popperInstance = null;
    }
  }
}
