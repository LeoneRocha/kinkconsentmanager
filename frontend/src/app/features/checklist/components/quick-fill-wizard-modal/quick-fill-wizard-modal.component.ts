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
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import {
  GroupDefinition,
  ItemResponseValue,
  ResolvedPreviewTexts,
  ScaleId,
  ScaleOption,
} from '../../../../core/models';
import {
  getGroupTitle,
  getItemAnswer,
  getItemLabel,
  getItemRoleLabels,
  isDualRoleScaleItem,
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
    'Atalhos: teclas 1–5 escolhem a escala e avançam, 0 limpa a marcação e ↑/↓ navegam entre itens.',
  empty: 'Não há itens de escala disponíveis para preenchimento rápido.',
  close: 'Fechar',
};

export interface QuickFillStep {
  readonly stepIndex: number;
  readonly key: string;
  readonly groupId: string;
  readonly groupTitle: string;
  readonly itemId: string;
  readonly itemLabel: string;
  readonly roleField: 'primaryScale' | 'secondaryScale';
  readonly roleLabel: string;
}

function parseScaleShortcutIndex(event: KeyboardEvent): number | null {
  if (event.key >= '1' && event.key <= '5') {
    return Number(event.key) - 1;
  }
  if (event.code.startsWith('Digit') || event.code.startsWith('Numpad')) {
    const suffix = event.code.slice(-1);
    if (suffix >= '1' && suffix <= '5') {
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
 * Keyboard-driven rapid-entry overlay stepping sequentially through scale_matrix checklist items.
 */
@Component({
  selector: 'app-quick-fill-wizard-modal',
  imports: [DialogModule, ButtonModule],
  templateUrl: './quick-fill-wizard-modal.component.html',
  styleUrl: './quick-fill-wizard-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickFillWizardModalComponent {
  readonly visible = input.required<boolean>();
  readonly groups = input.required<readonly GroupDefinition[]>();
  readonly scales = input.required<readonly ScaleOption[]>();
  readonly answers = input.required<Readonly<Record<string, ItemResponseValue>>>();
  readonly texts = input.required<ResolvedPreviewTexts>();
  readonly labels = input<QuickFillLabels>(DEFAULT_QUICK_FILL_LABELS);

  readonly visibleChange = output<boolean>();
  readonly answerChange = output<{ itemId: string; patch: Partial<ItemResponseValue> }>();

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
        if (item.type !== 'scale_matrix') {
          continue;
        }

        const itemLabel = getItemLabel(item, texts);
        const roleLabels = getItemRoleLabels(group, item, texts);
        const dualRole = isDualRoleScaleItem(group, item);

        result.push({
          stepIndex: index++,
          key: `${item.id}:primary`,
          groupId: group.id,
          groupTitle,
          itemId: item.id,
          itemLabel,
          roleField: 'primaryScale',
          roleLabel: roleLabels.primary,
        });

        if (dualRole) {
          result.push({
            stepIndex: index++,
            key: `${item.id}:secondary`,
            groupId: group.id,
            groupTitle,
            itemId: item.id,
            itemLabel,
            roleField: 'secondaryScale',
            roleLabel: roleLabels.secondary ?? roleLabels.primary,
          });
        }
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

  protected readonly previousSteps = computed<readonly QuickFillStep[]>(() => {
    const idx = this.safeIndex();
    return this.steps().slice(Math.max(0, idx - 3), idx);
  });

  protected readonly nextSteps = computed<readonly QuickFillStep[]>(() => {
    const idx = this.safeIndex();
    return this.steps().slice(idx + 1, idx + 4);
  });

  protected readonly currentScaleId = computed<ScaleId | undefined>(() => {
    const step = this.currentStep();
    if (!step) {
      return undefined;
    }
    return this.getStepScaleId(step);
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
      event.preventDefault();
      this.closeModal();
      return;
    }

    if (this.steps().length === 0) {
      return;
    }

    const scaleIndex = parseScaleShortcutIndex(event);
    if (scaleIndex !== null) {
      const targetScale = this.orderedScales()[scaleIndex];
      if (targetScale) {
        event.preventDefault();
        this.selectScale(targetScale.id);
      }
      return;
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

  protected onDialogVisibleChange(nextVisible: boolean): void {
    if (!nextVisible) {
      this.visibleChange.emit(false);
    }
  }

  protected closeModal(): void {
    this.visibleChange.emit(false);
  }

  protected goToStep(stepIndex: number): void {
    const total = this.steps().length;
    if (total === 0) {
      return;
    }
    this.currentIndex.set(Math.min(Math.max(0, stepIndex), total - 1));
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
    if (!step) {
      return;
    }

    this.emitStepScale(step, scaleId);
    this.nextStep();
  }

  protected clearCurrentStep(): void {
    const step = this.currentStep();
    if (!step) {
      return;
    }

    this.emitStepScale(step, undefined);
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

  protected getStepScaleColor(step: QuickFillStep): string | null {
    const scaleId = this.getStepScaleId(step);
    if (!scaleId) {
      return null;
    }
    return this.orderedScales().find((scale) => scale.id === scaleId)?.color ?? null;
  }

  private emitStepScale(step: QuickFillStep, scaleId: ScaleId | undefined): void {
    const patch: Partial<ItemResponseValue> =
      step.roleField === 'primaryScale'
        ? { primaryScale: scaleId }
        : { secondaryScale: scaleId };

    this.answerChange.emit({ itemId: step.itemId, patch });
  }
}
