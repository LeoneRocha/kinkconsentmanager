import { A11yModule } from '@angular/cdk/a11y';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  GroupDefinition,
  ItemDefinition,
  ItemResponseValue,
  OTHER_OPTION_VALUE,
  QuestionType,
  ResolvedPreviewTexts,
  ScaleId,
  ScaleOption,
} from '../../../../core/models';
import {
  getGroupTitle,
  getItemAnswer,
  getItemLabel,
  getItemRoleLabels,
  getItemTooltip,
  isDualRoleScaleItem,
  isQuestionAnswered,
} from '../../utils/checklist-view.helpers';

export interface QuickFillLabels {
  readonly title: string;
  readonly prev: string;
  readonly next: string;
  readonly clearKey: string;
  readonly shortcutHint: string;
  readonly empty: string;
  readonly close: string;
}

export const DEFAULT_QUICK_FILL_LABELS: QuickFillLabels = {
  title: 'Preenchimento Rápido',
  prev: 'Anterior',
  next: 'Próximo',
  clearKey: 'Limpar (0)',
  shortcutHint:
    'Atalhos: teclas numéricas escolhem a resposta, 0 limpa a marcação e ↑/↓ navegam entre itens.',
  empty: 'Não há itens disponíveis para preenchimento rápido.',
  close: 'Fechar',
};

export interface QuickFillChoiceOption {
  readonly id: string;
  readonly label: string;
  readonly isOther: boolean;
}

export interface QuickFillStep {
  readonly stepIndex: number;
  readonly key: string;
  readonly groupId: string;
  readonly groupTitle: string;
  readonly item: ItemDefinition;
  readonly itemId: string;
  readonly itemLabel: string;
  readonly itemTooltip: string;
  readonly itemType: QuestionType;
  readonly roleField?: 'primaryScale' | 'secondaryScale';
  readonly roleLabel?: string;
}

function parseShortcutIndex(event: KeyboardEvent): number | null {
  if (event.key >= '1' && event.key <= '9') {
    return Number(event.key) - 1;
  }
  if (event.code.startsWith('Digit') || event.code.startsWith('Numpad')) {
    const suffix = event.code.slice(-1);
    if (suffix >= '1' && suffix <= '9') {
      return Number(suffix) - 1;
    }
  }
  return null;
}

function isClearShortcut(event: KeyboardEvent): boolean {
  return event.key === '0' || event.code === 'Digit0' || event.code === 'Numpad0';
}

function isInteractiveInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toUpperCase();
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
}

/**
 * Minimalist keyboard-driven rapid-entry view/dialog stepping sequentially through all checklist items.
 */
@Component({
  selector: 'app-quick-fill-wizard-modal',
  imports: [A11yModule, NgTemplateOutlet, MatButtonModule, MatTooltipModule],
  templateUrl: './quick-fill-wizard-modal.component.html',
  styleUrl: './quick-fill-wizard-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickFillWizardModalComponent {
  readonly visible = input.required<boolean>();
  readonly inline = input<boolean>(false);
  readonly groups = input.required<readonly GroupDefinition[]>();
  readonly scales = input.required<readonly ScaleOption[]>();
  readonly answers = input.required<Readonly<Record<string, ItemResponseValue>>>();
  readonly texts = input.required<ResolvedPreviewTexts>();
  readonly labels = input<QuickFillLabels>(DEFAULT_QUICK_FILL_LABELS);
  readonly otherPlaceholder = input<string>('Descreva brevemente sua preferência...');
  readonly readAloudLabel = input<string>('Ouvir leitura deste item');

  readonly visibleChange = output<boolean>();
  readonly answerChange = output<{ itemId: string; patch: Partial<ItemResponseValue> }>();
  readonly readAloud = output<string>();

  protected readonly otherOptionValue = OTHER_OPTION_VALUE;
  private readonly currentIndex = signal(0);
  private wasVisible = false;

  protected readonly orderedScales = computed<readonly ScaleOption[]>(() =>
    [...this.scales()].sort((a, b) => a.order - b.order),
  );

  protected readonly steps = computed<readonly QuickFillStep[]>(() => {
    const texts = this.texts();
    const result: QuickFillStep[] = [];
    let index = 0;

    for (const group of this.groups()) {
      const groupTitle = getGroupTitle(group, texts);

      for (const item of group.items) {
        const itemLabel = getItemLabel(item, texts);
        const itemTooltip = getItemTooltip(item, texts);

        if (item.type === 'scale_matrix') {
          const roleLabels = getItemRoleLabels(group, item, texts);
          const dualRole = isDualRoleScaleItem(group, item);

          result.push({
            stepIndex: index++,
            key: `${item.id}:primary`,
            groupId: group.id,
            groupTitle,
            item,
            itemId: item.id,
            itemLabel,
            itemTooltip,
            itemType: item.type,
            roleField: 'primaryScale',
            roleLabel: roleLabels.primary,
          });

          if (dualRole) {
            result.push({
              stepIndex: index++,
              key: `${item.id}:secondary`,
              groupId: group.id,
              groupTitle,
              item,
              itemId: item.id,
              itemLabel,
              itemTooltip,
              itemType: item.type,
              roleField: 'secondaryScale',
              roleLabel: roleLabels.secondary ?? roleLabels.primary,
            });
          }
          continue;
        }

        result.push({
          stepIndex: index++,
          key: item.id,
          groupId: group.id,
          groupTitle,
          item,
          itemId: item.id,
          itemLabel,
          itemTooltip,
          itemType: item.type,
        });
      }
    }

    return result;
  });

  protected readonly safeIndex = computed<number>(() => {
    const total = this.steps().length;
    if (total === 0) {
      return 0;
    }
    return Math.min(Math.max(0, this.currentIndex()), total - 1);
  });

  protected readonly currentStep = computed<QuickFillStep | null>(() => {
    const steps = this.steps();
    if (steps.length === 0) {
      return null;
    }
    return steps[this.safeIndex()] ?? null;
  });

  protected readonly currentAnswer = computed<ItemResponseValue | undefined>(() => {
    const step = this.currentStep();
    if (!step) {
      return undefined;
    }
    return getItemAnswer(this.answers(), step.itemId);
  });

  protected readonly currentScaleId = computed<ScaleId | undefined>(() => {
    const step = this.currentStep();
    if (!step || step.itemType !== 'scale_matrix' || !step.roleField) {
      return undefined;
    }
    return this.getStepScaleId(step);
  });

  protected readonly currentChoiceOptions = computed<readonly QuickFillChoiceOption[]>(() => {
    const step = this.currentStep();
    if (!step || (step.itemType !== 'single_choice' && step.itemType !== 'multiple_choice')) {
      return [];
    }
    const texts = this.texts();
    const list: QuickFillChoiceOption[] = (step.item.options ?? []).map((optionId) => ({
      id: optionId,
      label: texts.options[optionId] ?? optionId,
      isOther: false,
    }));
    if (step.item.allowOtherOption) {
      list.push({
        id: OTHER_OPTION_VALUE,
        label: texts.otherLabel,
        isOther: true,
      });
    }
    return list;
  });

  protected readonly isOtherOptionSelected = computed<boolean>(() => {
    const step = this.currentStep();
    const answer = this.currentAnswer();
    if (!step || !answer) {
      return false;
    }
    if (step.itemType === 'single_choice') {
      return answer.selectedOption === OTHER_OPTION_VALUE;
    }
    if (step.itemType === 'multiple_choice') {
      return (answer.selectedOptions ?? []).includes(OTHER_OPTION_VALUE);
    }
    return false;
  });

  protected readonly currentOtherText = computed<string>(
    () => this.currentAnswer()?.otherText ?? '',
  );

  protected readonly currentCustomText = computed<string>(
    () => this.currentAnswer()?.customText ?? '',
  );

  protected readonly currentMaxTextLength = computed<number>(
    () => this.currentStep()?.item.maxLength ?? 300,
  );

  protected readonly currentOtherMaxLength = computed<number>(
    () => this.currentStep()?.item.maxLength ?? 120,
  );

  protected readonly isCurrentStepAnswered = computed<boolean>(() => {
    const step = this.currentStep();
    if (!step) {
      return false;
    }
    if (step.itemType === 'scale_matrix') {
      return Boolean(this.currentScaleId());
    }
    return isQuestionAnswered(step.item, this.currentAnswer());
  });

  protected readonly canGoPrev = computed<boolean>(() => this.safeIndex() > 0);
  protected readonly canGoNext = computed<boolean>(
    () => this.safeIndex() < this.steps().length - 1,
  );

  constructor() {
    effect(() => {
      const isOpen = this.visible();
      if (isOpen && !this.wasVisible) {
        this.currentIndex.set(0);
      }
      this.wasVisible = isOpen;
    });
  }

  @HostListener('window:keydown', ['$event'])
  protected onWindowKeydown(event: KeyboardEvent): void {
    if (!this.visible() || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    if (isInteractiveInputTarget(event.target)) {
      return;
    }

    if (event.key === 'Escape') {
      if (!this.inline()) {
        event.preventDefault();
        this.closeModal();
      }
      return;
    }

    const step = this.currentStep();
    if (!step) {
      return;
    }

    const shortcutIndex = parseShortcutIndex(event);
    if (shortcutIndex !== null) {
      if (step.itemType === 'scale_matrix') {
        const targetScale = this.orderedScales()[shortcutIndex];
        if (targetScale) {
          event.preventDefault();
          this.selectScale(targetScale.id);
        }
        return;
      }

      if (step.itemType === 'single_choice' || step.itemType === 'multiple_choice') {
        const targetOption = this.currentChoiceOptions()[shortcutIndex];
        if (targetOption) {
          event.preventDefault();
          if (step.itemType === 'single_choice') {
            this.selectSingleOption(targetOption.id);
          } else {
            this.toggleMultipleOption(targetOption.id);
          }
        }
        return;
      }
    }

    if (isClearShortcut(event)) {
      event.preventDefault();
      this.clearCurrentStep();
      return;
    }

    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        this.prevStep();
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        this.nextStep();
        break;
    }
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  protected onDialogVisibleChange(nextVisible: boolean): void {
    if (!nextVisible) {
      this.visibleChange.emit(false);
    }
  }

  protected closeModal(): void {
    this.visibleChange.emit(false);
  }

  protected prevStep(): void {
    if (this.canGoPrev()) {
      this.currentIndex.set(this.safeIndex() - 1);
    }
  }

  protected nextStep(): void {
    if (this.canGoNext()) {
      this.currentIndex.set(this.safeIndex() + 1);
    }
  }

  protected selectScale(scaleId: ScaleId): void {
    const step = this.currentStep();
    if (!step || step.itemType !== 'scale_matrix') {
      return;
    }

    this.emitStepScale(step, scaleId);
    this.nextStep();
  }

  protected selectSingleOption(optionId: string): void {
    const step = this.currentStep();
    if (!step || step.itemType !== 'single_choice') {
      return;
    }

    if (step.item.allowOtherOption) {
      this.answerChange.emit({
        itemId: step.itemId,
        patch: {
          selectedOption: optionId,
          otherText:
            optionId === OTHER_OPTION_VALUE ? (this.currentAnswer()?.otherText ?? '') : undefined,
        },
      });
    } else {
      this.answerChange.emit({
        itemId: step.itemId,
        patch: { selectedOption: optionId },
      });
    }

    if (optionId !== OTHER_OPTION_VALUE) {
      this.nextStep();
    }
  }

  protected toggleMultipleOption(optionId: string): void {
    const step = this.currentStep();
    if (!step || step.itemType !== 'multiple_choice') {
      return;
    }

    const current = this.currentAnswer()?.selectedOptions ?? [];
    const checked = !current.includes(optionId);
    const nextSelectedOptions = checked
      ? [...current, optionId]
      : current.filter((id) => id !== optionId);

    if (step.item.allowOtherOption) {
      const hasOther = nextSelectedOptions.includes(OTHER_OPTION_VALUE);
      this.answerChange.emit({
        itemId: step.itemId,
        patch: {
          selectedOptions: nextSelectedOptions,
          otherText: hasOther ? (this.currentAnswer()?.otherText ?? '') : undefined,
        },
      });
      return;
    }

    this.answerChange.emit({
      itemId: step.itemId,
      patch: { selectedOptions: nextSelectedOptions },
    });
  }

  protected isMultipleOptionSelected(optionId: string): boolean {
    return (this.currentAnswer()?.selectedOptions ?? []).includes(optionId);
  }

  protected onOtherTextEvent(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.onOtherTextInput(event.target.value);
    }
  }

  protected onOtherTextInput(value: string): void {
    const step = this.currentStep();
    if (!step) {
      return;
    }

    const maxLen = this.currentOtherMaxLength();
    const bounded = value.length > maxLen ? value.slice(0, maxLen) : value;

    if (step.itemType === 'single_choice') {
      this.answerChange.emit({
        itemId: step.itemId,
        patch: {
          selectedOption: OTHER_OPTION_VALUE,
          otherText: bounded,
        },
      });
      return;
    }

    if (step.itemType === 'multiple_choice') {
      const current = this.currentAnswer()?.selectedOptions ?? [];
      const selectedOptions = current.includes(OTHER_OPTION_VALUE)
        ? [...current]
        : [...current, OTHER_OPTION_VALUE];
      this.answerChange.emit({
        itemId: step.itemId,
        patch: {
          selectedOptions,
          otherText: bounded,
        },
      });
    }
  }

  protected onCustomTextEvent(event: Event): void {
    if (event.target instanceof HTMLTextAreaElement) {
      this.onCustomTextInput(event.target.value);
    }
  }

  protected onCustomTextInput(value: string): void {
    const step = this.currentStep();
    if (!step || step.itemType !== 'restricted_text') {
      return;
    }

    const maxLen = this.currentMaxTextLength();
    const bounded = value.length > maxLen ? value.slice(0, maxLen) : value;
    this.answerChange.emit({
      itemId: step.itemId,
      patch: { customText: bounded },
    });
  }

  protected clearCurrentStep(): void {
    const step = this.currentStep();
    if (!step) {
      return;
    }

    switch (step.itemType) {
      case 'scale_matrix':
        this.emitStepScale(step, undefined);
        break;
      case 'single_choice':
        this.answerChange.emit({
          itemId: step.itemId,
          patch: { selectedOption: undefined, otherText: undefined },
        });
        break;
      case 'multiple_choice':
        this.answerChange.emit({
          itemId: step.itemId,
          patch: { selectedOptions: [], otherText: undefined },
        });
        break;
      case 'restricted_text':
        this.answerChange.emit({
          itemId: step.itemId,
          patch: { customText: '' },
        });
        break;
    }
  }

  protected emitCurrentStepReadAloud(): void {
    const step = this.currentStep();
    if (!step) {
      return;
    }

    const parts = [step.groupTitle, step.itemLabel];
    if (step.roleLabel) {
      parts.push(step.roleLabel);
    }
    const selectedId = this.currentScaleId();
    if (selectedId) {
      parts.push(this.getScaleLabel(selectedId));
    }
    this.readAloud.emit(parts.join('. '));
  }

  protected getScaleLabel(scaleId: ScaleId): string {
    return this.texts().scales[scaleId] ?? scaleId;
  }

  protected getStepScaleId(step: QuickFillStep): ScaleId | undefined {
    const answer = getItemAnswer(this.answers(), step.itemId);
    if (!answer) {
      return undefined;
    }
    return step.roleField === 'primaryScale' ? answer.primaryScale : answer.secondaryScale;
  }

  private emitStepScale(step: QuickFillStep, scaleId: ScaleId | undefined): void {
    const patch: Partial<ItemResponseValue> =
      step.roleField === 'primaryScale' ? { primaryScale: scaleId } : { secondaryScale: scaleId };

    this.answerChange.emit({ itemId: step.itemId, patch });
  }
}
