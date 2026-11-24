import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { take } from 'rxjs';
import { ExportFormat, ExportResult, ResolvedPreviewTexts } from '../../../../core/models';
import { SCHEMA_REPOSITORY_TOKEN } from '../../../../core/repositories';
import {
  ChecklistAutosaveService,
  ChecklistStateService,
  I18nService,
  TelemetryService,
  UiFeedbackHostService,
} from '../../../../core/services';
import { ExportPreviewLayout, FullGridPreviewComponent } from '../../../../shared/components';
import { ExportActionsToolbarComponent } from '../../components/export-actions-toolbar';
import {
  ChecklistFlattenService,
  CsvExportService,
  JsonDraftService,
  PdfExportService,
  PngExportService,
} from '../../services';

/**
 * Smart container page for reviewing the completed checklist and exporting/restoring locally.
 */
@Component({
  selector: 'app-export-page',
  imports: [
    MatButtonModule,
    MatProgressSpinnerModule,
    ExportActionsToolbarComponent,
    FullGridPreviewComponent,
  ],
  templateUrl: './export-page.component.html',
  styleUrl: './export-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportPageComponent implements OnInit {
  private readonly checklistState = inject(ChecklistStateService);
  private readonly autosave = inject(ChecklistAutosaveService);
  private readonly i18n = inject(I18nService);
  private readonly schemaRepository = inject(SCHEMA_REPOSITORY_TOKEN);
  private readonly feedbackHost = inject(UiFeedbackHostService);
  private readonly telemetry = inject(TelemetryService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly checklistFlatten = inject(ChecklistFlattenService);
  private readonly pngExport = inject(PngExportService);
  private readonly pdfExport = inject(PdfExportService);
  private readonly jsonDraft = inject(JsonDraftService);
  private readonly csvExport = inject(CsvExportService);

  private readonly pngCaptureContainer = viewChild<ElementRef<HTMLElement>>('pngCaptureContainer');
  private readonly generatedAtDate = signal<Date>(new Date());

  protected readonly isLoadingSchema = signal<boolean>(false);
  protected readonly loadError = signal<boolean>(false);
  protected readonly busyFormat = signal<ExportFormat | null>(null);
  protected readonly previewLayout = signal<ExportPreviewLayout | null>(null);
  protected readonly hasSelectedLayout = computed<boolean>(() => this.previewLayout() !== null);

  protected readonly schema = this.checklistState.schema;
  protected readonly answers = this.checklistState.answers;
  protected readonly hasSchema = computed<boolean>(() => this.schema() !== null);

  protected readonly generatedAtValue = computed<string>(() => {
    const date = this.generatedAtDate();
    const lang = this.i18n.currentLang();
    try {
      return new Intl.DateTimeFormat(lang, {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(date);
    } catch {
      return date.toISOString().slice(0, 16).replace('T', ' ');
    }
  });

  protected readonly previewTexts = computed<ResolvedPreviewTexts | null>(() => {
    const activeSchema = this.schema();
    if (!activeSchema) {
      return null;
    }
    return this.i18n.buildResolvedPreviewTexts(activeSchema, this.generatedAtValue());
  });

  ngOnInit(): void {
    void this.autosave.restoreFromAutosave();
    this.loadSchemaIfNeeded();
  }

  protected t(key: string): string {
    return this.i18n.translateUi(key);
  }

  protected retryLoadSchema(): void {
    this.loadSchemaIfNeeded(true);
  }

  protected onBackToChecklist(): void {
    void this.router.navigate(['/checklist']);
  }

  protected onPreviewLayoutChange(layout: ExportPreviewLayout): void {
    this.previewLayout.set(layout);
    this.telemetry.trackEvent('export_layout_selected', { layout });
  }

  protected async onExportPng(): Promise<void> {
    const captureElement = this.pngCaptureContainer()?.nativeElement;
    if (!captureElement || !this.hasSchema() || this.busyFormat() !== null) {
      return;
    }

    this.busyFormat.set('png');
    const startedAt = Date.now();
    try {
      const result = await this.pngExport.exportElementAsPng(
        captureElement,
        this.buildExportFilename(),
      );
      this.notifyExportResult(result, Date.now() - startedAt);
    } finally {
      this.busyFormat.set(null);
    }
  }

  protected async onExportPdf(): Promise<void> {
    const activeSchema = this.schema();
    const texts = this.previewTexts();
    if (!activeSchema || !texts || this.busyFormat() !== null) {
      return;
    }

    this.busyFormat.set('pdf');
    const startedAt = Date.now();
    try {
      const rows = this.checklistFlatten.flatten(activeSchema, this.answers(), texts);
      const result = await this.pdfExport.exportPdf(
        activeSchema,
        rows,
        texts,
        this.buildExportFilename(),
      );
      this.notifyExportResult(result, Date.now() - startedAt);
    } finally {
      this.busyFormat.set(null);
    }
  }

  protected onPrint(): void {
    if (!this.hasSchema() || !this.hasSelectedLayout() || this.busyFormat() !== null) {
      return;
    }

    this.busyFormat.set('print');
    const startedAt = Date.now();
    const previousTitle = typeof document !== 'undefined' ? document.title : '';
    try {
      if (typeof document !== 'undefined') {
        document.title = this.buildExportFilename();
      }
      if (typeof window !== 'undefined' && typeof window.print === 'function') {
        window.print();
      }
      this.trackExportTelemetry('print', 'success', Date.now() - startedAt);
    } finally {
      if (typeof document !== 'undefined') {
        document.title = previousTitle;
      }
      this.busyFormat.set(null);
    }
  }

  protected onExportJson(): void {
    if (!this.hasSchema() || this.busyFormat() !== null) {
      return;
    }

    this.busyFormat.set('json');
    const startedAt = Date.now();
    try {
      const draft = this.checklistState.exportDraftSnapshot(this.i18n.currentLang());
      const result = this.jsonDraft.exportDraft(draft, this.buildExportFilename());
      this.notifyExportResult(result, Date.now() - startedAt);
    } finally {
      this.busyFormat.set(null);
    }
  }

  protected async onImportJsonFile(file: File): Promise<void> {
    const activeSchema = this.schema();
    if (!activeSchema || this.busyFormat() !== null) {
      return;
    }

    this.busyFormat.set('json');
    try {
      const rawContent = await this.readFileAsText(file);
      const validation = this.jsonDraft.parseAndValidateDraft(
        rawContent,
        activeSchema.schemaVersion,
      );

      if (validation.valid && validation.draft) {
        this.checklistState.importDraft(validation.draft);
        this.generatedAtDate.set(new Date());
        this.telemetry.trackEvent('checklist_json_imported', {
          source: 'export_page',
          status: 'success',
        });
        this.feedbackHost.success(`${this.t('importJson')} — ${this.t('importSuccess')}`, {
          actionLabel: this.t('notificationOkAction'),
          duration: 4000,
        });
        return;
      }

      const isIncompatibleVersion = validation.errors.some((error) =>
        error.toLowerCase().includes('incompatible'),
      );
      this.telemetry.trackEvent('checklist_json_imported', {
        source: 'export_page',
        status: 'error',
      });
      this.feedbackHost.error(
        `${this.t('importJson')} — ${isIncompatibleVersion
          ? this.t('importErrorIncompatibleVersion')
          : this.t('importErrorInvalidJson')
        }`,
        {
          actionLabel: this.t('notificationOkAction'),
          duration: 5000,
        },
      );
    } catch {
      this.feedbackHost.error(`${this.t('importJson')} — ${this.t('importErrorInvalidJson')}`, {
        actionLabel: this.t('notificationOkAction'),
        duration: 5000,
      });
    } finally {
      this.busyFormat.set(null);
    }
  }

  protected onExportCsv(): void {
    const activeSchema = this.schema();
    const texts = this.previewTexts();
    if (!activeSchema || !texts || this.busyFormat() !== null) {
      return;
    }

    this.busyFormat.set('csv');
    const startedAt = Date.now();
    try {
      const rows = this.checklistFlatten.flatten(activeSchema, this.answers(), texts);
      const result = this.csvExport.exportCsv(rows, this.buildExportFilename());
      this.notifyExportResult(result, Date.now() - startedAt);
    } finally {
      this.busyFormat.set(null);
    }
  }

  private buildExportFilename(): string {
    const mode = this.previewLayout() ?? 'modern';
    const dateStamp = new Date().toISOString().slice(0, 10);
    return `kink-consent-checklist-${mode}-${dateStamp}`;
  }

  private loadSchemaIfNeeded(forceReload = false): void {
    if (!forceReload && this.checklistState.schema() !== null) {
      return;
    }

    this.isLoadingSchema.set(true);
    this.loadError.set(false);

    this.schemaRepository
      .getChecklistSchema()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (loadedSchema) => {
          this.checklistState.initializeSchema(loadedSchema);
          this.isLoadingSchema.set(false);
        },
        error: () => {
          this.isLoadingSchema.set(false);
          this.loadError.set(true);
        },
      });
  }

  private notifyExportResult(result: ExportResult, durationMs: number): void {
    this.trackExportTelemetry(result.format, result.success ? 'success' : 'error', durationMs);

    if (result.success) {
      this.feedbackHost.success(`${result.filename} — ${this.t('exportSuccess')}`, {
        actionLabel: this.t('notificationOkAction'),
        duration: 4000,
      });
      return;
    }

    this.feedbackHost.error(
      `${result.filename} — ${result.errorMessage || this.t('exportError')}`,
      {
        actionLabel: this.t('notificationOkAction'),
        duration: 5000,
      },
    );
  }

  private trackExportTelemetry(
    format: ExportFormat,
    status: 'success' | 'error',
    durationMs: number,
  ): void {
    const layout = this.previewLayout() ?? 'modern';
    this.telemetry.trackEvent('export_completed', { format, layout, status });
    this.telemetry.trackMetric({
      name: 'export_duration_ms',
      average: durationMs,
      properties: { format, status },
    });
    this.telemetry.trackMetric({
      name: 'checklist_completion_percent',
      average: this.checklistState.progressPercentage(),
      properties: { format },
    });
  }

  private readFileAsText(file: File): Promise<string> {
    if (typeof file.text === 'function') {
      return file.text();
    }

    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(typeof reader.result === 'string' ? reader.result : '');
      };
      reader.onerror = () => {
        reject(reader.error ?? new Error('Failed to read selected file.'));
      };
      reader.readAsText(file, 'utf-8');
    });
  }
}
