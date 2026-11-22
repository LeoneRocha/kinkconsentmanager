import { DOCUMENT } from '@angular/core';
import { inject, Injectable } from '@angular/core';

/**
 * Browser-safe helper for triggering client-side file downloads from Blobs or Data URLs.
 */
@Injectable({ providedIn: 'root' })
export class FileDownloadService {
  private readonly document = inject(DOCUMENT);

  /**
   * Triggers a download for a binary/text Blob and immediately revokes the temporary object URL.
   */
  downloadBlob(blob: Blob, filename: string): void {
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      throw new Error('URL.createObjectURL is not available in this environment.');
    }

    const objectUrl = URL.createObjectURL(blob);
    try {
      this.triggerAnchorDownload(objectUrl, filename);
    } finally {
      if (typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(objectUrl);
      }
    }
  }

  /**
   * Triggers a download directly from an encoded Data URL (e.g. PNG output).
   */
  downloadDataUrl(dataUrl: string, filename: string): void {
    this.triggerAnchorDownload(dataUrl, filename);
  }

  private triggerAnchorDownload(href: string, filename: string): void {
    const anchor = this.document.createElement('a');
    anchor.href = href;
    anchor.download = filename;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';

    const body = this.document.body;
    if (body) {
      body.appendChild(anchor);
    }

    try {
      anchor.click();
    } finally {
      anchor.remove();
    }
  }
}
