import { ErrorHandler, Injectable, inject } from '@angular/core';
import { TelemetryService } from './telemetry.service';

/**
 * ErrorHandler global que encaminha excecoes nao tratadas para `TelemetryService`
 * preservando o log padrao no console sem expor dados do checklist.
 */
@Injectable()
export class TelemetryErrorHandler implements ErrorHandler {
  private readonly telemetry = inject(TelemetryService);

  handleError(error: unknown): void {
    this.telemetry.trackException(error);
    console.error(error);
  }
}
