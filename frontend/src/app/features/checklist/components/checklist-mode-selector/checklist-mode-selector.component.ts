import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ChecklistViewMode } from '../../../../core/models';

export interface ChecklistModeSelectorLabels {
  readonly pageTitle: string;
  readonly pageSubtitle: string;
  readonly howToFillLabel: string;
  readonly startButton: string;
  readonly continueButton: string;
  readonly existingProgressLabel: string;
  readonly stepperTitle: string;
  readonly stepperBadge: string;
  readonly stepperDesc: string;
  readonly stepperHowToFill: string;
  readonly classicTitle: string;
  readonly classicBadge: string;
  readonly classicDesc: string;
  readonly classicHowToFill: string;
  readonly fullTitle: string;
  readonly fullBadge: string;
  readonly fullDesc: string;
  readonly fullHowToFill: string;
  readonly quickFillTitle: string;
  readonly quickFillBadge: string;
  readonly quickFillDesc: string;
  readonly quickFillHowToFill: string;
  readonly importTitle: string;
  readonly importDesc: string;
  readonly importButton: string;
}

interface ModeOptionCard {
  readonly mode: ChecklistViewMode;
  readonly icon: string;
  readonly title: string;
  readonly badge: string;
  readonly description: string;
  readonly howToFill: string;
}

/**
 * Start screen for /checklist letting users pick a filling mode with instructions or import a JSON draft.
 */
@Component({
  selector: 'app-checklist-mode-selector',
  imports: [MatButtonModule],
  templateUrl: './checklist-mode-selector.component.html',
  styleUrl: './checklist-mode-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistModeSelectorComponent {
  readonly labels = input.required<ChecklistModeSelectorLabels>();
  readonly answeredCount = input<number>(0);
  readonly totalCount = input<number>(0);
  readonly progressPercentage = input<number>(0);
  readonly isImporting = input<boolean>(false);

  readonly selectMode = output<ChecklistViewMode>();
  readonly importJsonFile = output<File>();

  private readonly jsonFileInput = viewChild<ElementRef<HTMLInputElement>>('jsonFileInput');

  protected readonly hasSavedProgress = computed<boolean>(() => this.answeredCount() > 0);

  protected readonly modeCards = computed<readonly ModeOptionCard[]>(() => {
    const l = this.labels();
    return [
      {
        mode: 'stepper',
        icon: 'fa-solid fa-route',
        title: l.stepperTitle,
        badge: l.stepperBadge,
        description: l.stepperDesc,
        howToFill: l.stepperHowToFill,
      },
      {
        mode: 'classic',
        icon: 'fa-solid fa-grip',
        title: l.classicTitle,
        badge: l.classicBadge,
        description: l.classicDesc,
        howToFill: l.classicHowToFill,
      },
      {
        mode: 'full',
        icon: 'fa-solid fa-list-check',
        title: l.fullTitle,
        badge: l.fullBadge,
        description: l.fullDesc,
        howToFill: l.fullHowToFill,
      },
      {
        mode: 'quick_fill',
        icon: 'fa-solid fa-bolt',
        title: l.quickFillTitle,
        badge: l.quickFillBadge,
        description: l.quickFillDesc,
        howToFill: l.quickFillHowToFill,
      },
    ];
  });

  protected onSelectMode(mode: ChecklistViewMode): void {
    this.selectMode.emit(mode);
  }

  protected onImportTriggerClick(): void {
    if (this.isImporting()) {
      return;
    }
    this.jsonFileInput()?.nativeElement.click();
  }

  protected onFileSelected(event: Event): void {
    const inputElement = event.target as HTMLInputElement | null;
    const selectedFile = inputElement?.files?.[0];
    if (selectedFile) {
      this.importJsonFile.emit(selectedFile);
    }
    if (inputElement) {
      inputElement.value = '';
    }
  }
}
