import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';

export type AppIconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Componente reutilizável que encapsula ícones Font Awesome,
 * aceitando tanto definições SVG tree-shaken (`@fortawesome/free-solid-svg-icons`,
 * `@fortawesome/free-brands-svg-icons`) quanto classes CSS (`fa-solid fa-...`).
 */
@Component({
  selector: 'app-icon',
  templateUrl: './app-icon.component.html',
  styleUrl: './app-icon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppIconComponent {
  readonly icon = input.required<IconDefinition | string>();
  readonly size = input<AppIconSize>('md');
  readonly spin = input<boolean>(false);
  readonly fixedWidth = input<boolean>(false);
  readonly ariaLabel = input<string>('');
  readonly title = input<string>('');

  protected readonly effectiveTitle = computed<string>(
    () => this.title().trim() || this.ariaLabel().trim(),
  );
  protected readonly hasAccessibleLabel = computed<boolean>(() => this.effectiveTitle().length > 0);

  protected readonly svgDefinition = computed<IconDefinition | null>(() => {
    const value = this.icon();
    return typeof value === 'string' ? null : value;
  });

  protected readonly cssIconClasses = computed<string>(() => {
    const value = this.icon();
    if (typeof value !== 'string') {
      return '';
    }
    const classes = [value];
    if (this.fixedWidth()) {
      classes.push('fa-fw');
    }
    if (this.spin()) {
      classes.push('fa-spin');
    }
    return classes.join(' ');
  });

  protected readonly svgViewBox = computed<string>(() => {
    const def = this.svgDefinition();
    if (!def) {
      return '0 0 512 512';
    }
    const [width, height] = def.icon;
    return `0 0 ${width} ${height}`;
  });

  protected readonly svgPaths = computed<readonly string[]>(() => {
    const def = this.svgDefinition();
    if (!def) {
      return [];
    }
    const pathData = def.icon[4];
    return Array.isArray(pathData) ? pathData : [pathData];
  });

  protected readonly wrapperClasses = computed<string>(() => {
    const classes = ['kcm-icon', `kcm-icon--${this.size()}`];
    if (this.fixedWidth()) {
      classes.push('kcm-icon--fw');
    }
    if (this.spin()) {
      classes.push('kcm-icon--spin');
    }
    return classes.join(' ');
  });
}
