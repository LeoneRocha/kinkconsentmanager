import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { HeaderA11yMenuComponent } from '../header-a11y-menu';
import { HeaderLanguageMenuComponent } from '../header-language-menu';
import { HeaderThemeMenuComponent } from '../header-theme-menu';
import { HeaderUserMenuComponent } from '../header-user-menu';

export type HeaderPopoverId = 'theme' | 'language' | 'a11y' | 'user' | null;

/**
 * Orchestrates the topbar utility icons and ensures mutually exclusive popover state.
 */
@Component({
  selector: 'app-header-utilities',
  imports: [
    HeaderThemeMenuComponent,
    HeaderLanguageMenuComponent,
    HeaderA11yMenuComponent,
    HeaderUserMenuComponent,
  ],
  templateUrl: './header-utilities.component.html',
  styleUrl: './header-utilities.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderUtilitiesComponent {
  private readonly hostElement = inject(ElementRef<HTMLElement>);

  protected readonly activePopover = signal<HeaderPopoverId>(null);

  @HostListener('document:keydown.escape')
  protected onEscapePressed(): void {
    if (this.activePopover() !== null) {
      this.closePopovers();
    }
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.activePopover() === null) {
      return;
    }

    const target = event.target as Node | null;
    if (target && !this.hostElement.nativeElement.contains(target)) {
      this.closePopovers();
    }
  }

  protected togglePopover(id: Exclude<HeaderPopoverId, null>): void {
    this.activePopover.update((current) => (current === id ? null : id));
  }

  public closePopovers(): void {
    this.activePopover.set(null);
  }
}
