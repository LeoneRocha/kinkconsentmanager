import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import {
  NotificationPosition,
  NotificationService,
  NotificationType,
} from '../../../core/services';
import { SchemaTranslatePipe } from '../../pipes';

@Component({
  selector: 'app-toast-container',
  imports: [SchemaTranslatePipe],
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppToastContainerComponent {
  protected readonly notifications = inject(NotificationService);

  readonly position = input<NotificationPosition | null>(null);

  protected readonly containerPositionClass = computed<string>(() => {
    const pos = this.position() ?? this.notifications.defaultPosition();
    const vertical = pos.vertical ?? 'top';
    const horizontal = pos.horizontal ?? 'center';
    return `kcm-toast-container--${vertical}-${horizontal}`;
  });

  protected iconFor(type: NotificationType): string {
    switch (type) {
      case 'success':
        return 'fa-circle-check';
      case 'error':
        return 'fa-circle-exclamation';
      case 'warning':
        return 'fa-triangle-exclamation';
      default:
        return 'fa-circle-info';
    }
  }
}
