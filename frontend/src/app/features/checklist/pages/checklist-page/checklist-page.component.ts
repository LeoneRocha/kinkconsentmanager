import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule } from 'primeng/skeleton';
import { Subscription } from 'rxjs';
import {
  ChecklistViewMode,
  ItemResponseValue,
  ResolvedPreviewTexts,
  SupportedLanguage,
} from '../../../../core/models';
import { SCHEMA_REPOSITORY_TOKEN } from '../../../../core/repositories';
import { ChecklistStateService, I18nService } from '../../../../core/services';
import { CategoryAccordionComponent } from '../../components/category-accordion';
import {
  ChecklistHeaderComponent,
  ChecklistHeaderLabels,
} from '../../components/checklist-header';
import { FullViewContainerComponent } from '../../components/full-view-container';
import {
  QuickFillLabels,
  QuickFillWizardModalComponent,
} from '../../components/quick-fill-wizard-modal';

/**
 * Smart container coordinating checklist schema loading, reactive filtering, localization, and navigation.
 */
@Component({
  selector: 'app-checklist-page',
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    SkeletonModule,
    ChecklistHeaderComponent,
    CategoryAccordionComponent,
    FullViewContainerComponent,
    QuickFillWizardModalComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './checklist-page.component.html',
  styleUrl: './checklist-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistPageComponent implements OnInit {
  private readonly schemaRepository = inject(SCHEMA_REPOSITORY_TOKEN);
  protected readonly checklistState = inject(ChecklistStateService);
  protected readonly i18n = inject(I18nService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly contentContainer = viewChild<ElementRef<HTMLElement>>('contentContainer');
  private loadSubscription: Subscription | null = null;

  protected readonly isLoading = signal<boolean>(true);
  protected readonly loadError = signal<boolean>(false);
  protected readonly quickFillVisible = signal<boolean>(false);

  protected readonly schema = this.checklistState.schema;
  protected readonly filteredGroups = this.checklistState.filteredGroups;
  protected readonly answers = this.checklistState.answers;
  protected readonly viewMode = this.checklistState.viewMode;
  protected readonly searchQuery = this.checklistState.searchQuery;
  protected readonly onlyUnanswered = this.checklistState.onlyUnanswered;
  protected readonly answeredCount = this.checklistState.answeredItemsCount;
  protected readonly totalCount = this.checklistState.totalItemsCount;
  protected readonly progressPercentage = this.checklistState.progressPercentage;

  protected readonly hasAnswers = computed<boolean>(
    () => Object.keys(this.answers()).length > 0,
  );

  protected readonly activeAccordionIndex = computed<number>(() => {
    const groups = this.filteredGroups();
    if (groups.length === 0) {
      return 0;
    }
    return Math.min(this.checklistState.activeCategoryIndex(), groups.length - 1);
  });

  protected readonly resolvedTexts = computed<ResolvedPreviewTexts | null>(() => {
    const currentSchema = this.schema();
    this.i18n.currentLang();
    if (!currentSchema) {
      return null;
    }
    return this.i18n.buildResolvedPreviewTexts(currentSchema, '');
  });

  protected readonly headerLabels = computed<ChecklistHeaderLabels>(() => {
    this.i18n.currentLang();
    return {
      title: this.i18n.translateUi('title'),
      subtitle: this.i18n.translateUi('subtitle'),
      languageLabel: this.i18n.translateUi('languageLabel'),
      accordionMode: this.i18n.translateUi('accordionMode'),
      fullMode: this.i18n.translateUi('fullMode'),
      quickFillButton: this.i18n.translateUi('quickFillButton'),
      searchPlaceholder: this.i18n.translateUi('searchPlaceholder'),
      onlyUnanswered: this.i18n.translateUi('onlyUnanswered'),
      clearAll: this.i18n.translateUi('clearAll'),
      progressLabel: this.i18n.translateUi('progressLabel'),
      exportButton: this.i18n.translateUi('navExport'),
      legendTitle: this.i18n.translateUi('legendTitle'),
      privacyNotice: this.i18n.translateUi('privacyNotice'),
      clearSearch: this.i18n.translateUi('clearSelection'),
    };
  });

  protected readonly quickFillLabels = computed<QuickFillLabels>(() => {
    this.i18n.currentLang();
    return {
      title: this.i18n.translateUi('quickFillTitle'),
      prev: this.i18n.translateUi('quickFillPrev'),
      next: this.i18n.translateUi('quickFillNext'),
      clearKey: this.i18n.translateUi('quickFillClearKey'),
      shortcutHint: this.i18n.translateUi('quickFillShortcutHint'),
      empty: this.i18n.translateUi('quickFillEmpty'),
      close: this.i18n.translateUi('quickFillClose'),
    };
  });

  protected readonly nextCategoryLabel = computed<string>(() => {
    this.i18n.currentLang();
    return this.i18n.translateUi('nextCategory');
  });

  protected readonly finishLabel = computed<string>(() => {
    this.i18n.currentLang();
    return this.i18n.translateUi('finishAndExport');
  });

  protected readonly noResultsText = computed<string>(() => {
    this.i18n.currentLang();
    return this.i18n.translateUi('noResults');
  });

  protected readonly otherPlaceholder = computed<string>(() => {
    this.i18n.currentLang();
    return this.i18n.translateUi('otherOptionPlaceholder');
  });

  protected readonly quickNavTitle = computed<string>(() => {
    this.i18n.currentLang();
    return this.i18n.translateUi('quickNavTitle');
  });

  protected readonly loadingErrorText = computed<string>(() => {
    this.i18n.currentLang();
    return this.i18n.translateUi('loadingError');
  });

  protected readonly retryLabel = computed<string>(() => {
    this.i18n.currentLang();
    return this.i18n.translateUi('retry');
  });

  protected readonly loadingSchemaLabel = computed<string>(() => {
    this.i18n.currentLang();
    return this.i18n.translateUi('loadingSchema');
  });

  constructor() {
    effect(() => {
      const currentSchema = this.schema();
      this.i18n.currentLang();
      if (!currentSchema) {
        return;
      }

      const labels: Record<string, string> = {};
      for (const group of currentSchema.groups) {
        const groupTitle = this.i18n.getGroupTitle(group.id);
        for (const item of group.items) {
          labels[item.id] = `${this.i18n.getItemLabel(item.id)} ${groupTitle}`.trim();
        }
      }

      untracked(() => {
        this.checklistState.setSearchableLabels(labels);
      });
    });
  }

  ngOnInit(): void {
    this.loadSchema();
  }

  protected loadSchema(): void {
    this.loadSubscription?.unsubscribe();
    this.isLoading.set(true);
    this.loadError.set(false);

    this.loadSubscription = this.schemaRepository
      .getChecklistSchema('v1')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (loadedSchema) => {
          this.checklistState.initializeSchema(loadedSchema);
          this.isLoading.set(false);
          this.loadError.set(false);
        },
        error: () => {
          this.loadError.set(true);
          this.isLoading.set(false);
        },
      });
  }

  protected onLanguageChange(lang: SupportedLanguage): void {
    this.i18n.setLanguage(lang);
  }

  protected onViewModeChange(mode: ChecklistViewMode): void {
    this.checklistState.setViewMode(mode);
  }

  protected onSearchQueryChange(query: string): void {
    this.checklistState.setSearchQuery(query);
  }

  protected onOnlyUnansweredChange(enabled: boolean): void {
    this.checklistState.setOnlyUnanswered(enabled);
  }

  protected onActiveCategoryChange(index: number): void {
    this.checklistState.setActiveCategory(index);
  }

  protected onAnswerChange(event: { itemId: string; patch: Partial<ItemResponseValue> }): void {
    this.checklistState.setItemAnswer(event.itemId, event.patch);
  }

  protected onNextCategory(): void {
    const groups = this.filteredGroups();
    const schemaGroups = this.schema()?.groups ?? [];
    const isUnfiltered = groups.length === schemaGroups.length;

    if (isUnfiltered) {
      const advanced = this.checklistState.nextCategory();
      if (advanced) {
        this.scrollToContentTop();
        return;
      }
      this.onFinishChecklist();
      return;
    }

    const currentIndex = this.activeAccordionIndex();
    if (currentIndex < groups.length - 1) {
      this.checklistState.setActiveCategory(currentIndex + 1);
      this.scrollToContentTop();
      return;
    }

    this.onFinishChecklist();
  }

  protected onOpenQuickFill(): void {
    this.quickFillVisible.set(true);
  }

  protected onClearAll(): void {
    this.confirmationService.confirm({
      header: this.i18n.translateUi('clearConfirmTitle'),
      message: this.i18n.translateUi('clearConfirmMessage'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.i18n.translateUi('confirmYes'),
      rejectLabel: this.i18n.translateUi('confirmNo'),
      acceptButtonProps: {
        severity: 'danger',
      },
      rejectButtonProps: {
        severity: 'secondary',
        outlined: true,
      },
      accept: () => {
        this.checklistState.resetAllAnswers();
      },
    });
  }

  protected onFinishChecklist(): void {
    void this.router.navigate(['/export']);
  }

  private scrollToContentTop(): void {
    const el = this.contentContainer()?.nativeElement;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
