import { TestBed } from '@angular/core/testing';
import { TelemetryErrorHandler } from './telemetry-error.handler';
import { TelemetryService } from './telemetry.service';

describe('TelemetryErrorHandler', () => {
  it('should forward unhandled exceptions to TelemetryService and log to console.error', () => {
    const telemetryMock = { trackException: jest.fn() };
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    TestBed.configureTestingModule({
      providers: [TelemetryErrorHandler, { provide: TelemetryService, useValue: telemetryMock }],
    });

    const handler = TestBed.inject(TelemetryErrorHandler);
    const err = new Error('Runtime failure');
    handler.handleError(err);

    expect(telemetryMock.trackException).toHaveBeenCalledWith(err);
    expect(consoleSpy).toHaveBeenCalledWith(err);

    consoleSpy.mockRestore();
  });
});
