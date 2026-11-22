import { inject, Injectable, InjectionToken } from '@angular/core';
import { ExportResult } from '../../../core/models';
import { FileDownloadService } from './file-download.service';

export type PngRendererFn = (element: HTMLElement) => Promise<string>;

/**
 * Injectable PNG rendering adapter wrapping `html-to-image` dynamic import for clean testability.
 */
export const PNG_RENDERER = new InjectionToken<PngRendererFn>('PNG_RENDERER', {
  providedIn: 'root',
  factory: () => async (element: HTMLElement): Promise<string> => {
    const { toPng } = await import('html-to-image');
    return toPng(element, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
    });
  },
});

/**
 * Exports a rendered preview DOM container as a high-resolution PNG image.
 */
@Injectable({ providedIn: 'root' })
export class PngExportService {
  private readonly fileDownload = inject(FileDownloadService);
  private readonly pngRenderer = inject(PNG_RENDERER);

  /**
   * Renders the given DOM element to a PNG Data URL.
   */
  renderElementToPng(element: HTMLElement): Promise<string> {
    return this.pngRenderer(element);
  }

  /**
   * Captures the given DOM element as PNG and triggers a browser file download.
   */
  async exportElementAsPng(element: HTMLElement, filename?: string): Promise<ExportResult> {
    const resolvedFilename = this.resolveFilename(filename);

    if (!element) {
      return {
        format: 'png',
        filename: resolvedFilename,
        success: false,
        errorMessage: 'Target DOM element is required for PNG export.',
      };
    }

    try {
      const dataUrl = await this.renderElementToPng(element);
      if (!dataUrl || dataUrl.trim().length === 0) {
        return {
          format: 'png',
          filename: resolvedFilename,
          success: false,
          errorMessage: 'Generated PNG data URL is empty.',
        };
      }

      this.fileDownload.downloadDataUrl(dataUrl, resolvedFilename);
      return {
        format: 'png',
        filename: resolvedFilename,
        success: true,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unexpected error during PNG generation.';
      return {
        format: 'png',
        filename: resolvedFilename,
        success: false,
        errorMessage,
      };
    }
  }

  private resolveFilename(filename?: string): string {
    const trimmed = filename?.trim();
    if (trimmed && trimmed.length > 0) {
      return trimmed.toLowerCase().endsWith('.png') ? trimmed : `${trimmed}.png`;
    }
    const dateStamp = new Date().toISOString().slice(0, 10);
    return `kink-consent-checklist-${dateStamp}.png`;
  }
}
