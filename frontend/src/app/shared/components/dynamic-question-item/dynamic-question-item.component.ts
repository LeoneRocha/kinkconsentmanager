import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  ItemDefinition,
  ItemResponseValue,
  OTHER_OPTION_VALUE,
  ResolvedRolePairLabels,
  ScaleId,
  ScaleOption,
} from '../../../core/models';
import { ScaleSelectorComponent } from '../scale-selector';

let nextQuestionUid = 0;

@Component({
  selector: 'app-dynamic-question-item',
  imports: [
    FormsModule,
    MatRadioModule,
    MatCheckboxModule,
    MatTooltipModule,
    ScaleSelectorComponent,
  ],
  templateUrl: './dynamic-question-item.component.html',
  styleUrl: './dynamic-question-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DynamicQuestionItemComponent {
  readonly item = input.required<ItemDefinition>();
  readonly scales = input.required<readonly ScaleOption[]>();
  readonly isDualRole = input.required<boolean>();
  readonly roleLabels = input.required<ResolvedRolePairLabels>();
  readonly itemLabel = input.required<string>();
  readonly itemTooltip = input<string>('');
  readonly scaleLabels = input.required<Readonly<Record<string, string>>>();
  readonly optionLabels = input.required<Readonly<Record<string, string>>>();
  readonly otherLabel = input<string>('Outro');
  readonly otherPlaceholder = input<string>('Especifique...');
  readonly readAloudLabel = input<string>('Ouvir leitura deste item');
  readonly answer = input<ItemResponseValue | undefined>(undefined);

  readonly answerChange = output<Partial<ItemResponseValue>>();
  readonly readAloud = output<void>();

  private readonly uid = ++nextQuestionUid;
  protected readonly otherOptionValue = OTHER_OPTION_VALUE;

  protected readonly questionLabelId = computed(() => `q-label-${this.uid}-${this.item().id}`);
  protected readonly radioGroupName = computed(() => `q-radio-${this.uid}-${this.item().id}`);
  protected readonly hasTooltip = computed(() => this.itemTooltip().trim().length > 0);
  protected readonly effectiveReadAloudLabel = computed(() => {
    const label = this.readAloudLabel().trim();
    const fallback = label.length > 0 ? label : 'Ouvir leitura deste item';
    return `${fallback}: ${this.itemLabel()}`;
  });
  protected readonly maxTextLength = computed(() => this.item().maxLength ?? 300);
  protected readonly customTextLength = computed(() => (this.answer()?.customText ?? '').length);
  protected readonly selectedSingleOption = computed<string | null>(
    () => this.answer()?.selectedOption ?? null,
  );
  protected readonly isOtherSingleSelected = computed(
    () => this.answer()?.selectedOption === OTHER_OPTION_VALUE,
  );
  protected readonly isOtherMultipleSelected = computed(() =>
    (this.answer()?.selectedOptions ?? []).includes(OTHER_OPTION_VALUE),
  );

  protected optionInputId(optionId: string): string {
    return `q-opt-${this.uid}-${this.item().id}-${optionId}`;
  }

  protected getOptionLabel(optionId: string): string {
    return this.optionLabels()[optionId] ?? optionId;
  }

  protected isMultipleOptionSelected(optionId: string): boolean {
    return (this.answer()?.selectedOptions ?? []).includes(optionId);
  }

  protected onPrimaryScaleChange(primaryScale: ScaleId | undefined): void {
    this.answerChange.emit({ primaryScale });
  }

  protected onSecondaryScaleChange(secondaryScale: ScaleId | undefined): void {
    this.answerChange.emit({ secondaryScale });
  }

  protected onSingleOptionSelect(selectedOption: string): void {
    if (this.item().allowOtherOption) {
      this.answerChange.emit({
        selectedOption,
        otherText:
          selectedOption === OTHER_OPTION_VALUE ? (this.answer()?.otherText ?? '') : undefined,
      });
      return;
    }
    this.answerChange.emit({ selectedOption });
  }

  protected onSingleOtherTextChange(otherText: string): void {
    this.answerChange.emit({
      selectedOption: OTHER_OPTION_VALUE,
      otherText,
    });
  }

  protected onMultipleOptionToggle(optionId: string, checked: boolean): void {
    const current = this.answer()?.selectedOptions ?? [];
    const nextSelectedOptions = checked
      ? current.includes(optionId)
        ? [...current]
        : [...current, optionId]
      : current.filter((id) => id !== optionId);

    if (this.item().allowOtherOption) {
      const hasOther = nextSelectedOptions.includes(OTHER_OPTION_VALUE);
      this.answerChange.emit({
        selectedOptions: nextSelectedOptions,
        otherText: hasOther ? (this.answer()?.otherText ?? '') : undefined,
      });
      return;
    }

    this.answerChange.emit({
      selectedOptions: nextSelectedOptions,
    });
  }

  protected onMultipleOtherTextChange(otherText: string): void {
    const current = this.answer()?.selectedOptions ?? [];
    const selectedOptions = current.includes(OTHER_OPTION_VALUE)
      ? [...current]
      : [...current, OTHER_OPTION_VALUE];
    this.answerChange.emit({
      selectedOptions,
      otherText,
    });
  }

  protected onCustomTextChange(customText: string): void {
    const maxLen = this.maxTextLength();
    const bounded = customText.length > maxLen ? customText.slice(0, maxLen) : customText;
    this.answerChange.emit({ customText: bounded });
  }
}
