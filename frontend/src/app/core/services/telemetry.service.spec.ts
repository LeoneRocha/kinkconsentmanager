import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import {
  TELEMETRY_CONFIG,
  TELEMETRY_SDK_LOADER,
  TelemetryClient,
  TelemetryService,
} from './telemetry.service';

describe('TelemetryService', () => {
  let routerEvents$: Subject<unknown>;
  let mockClient: jest.Mocked<TelemetryClient>;
  let sdkLoaderMock: jest.Mock<Promise<TelemetryClient>, [string]>;

  const createService = (enabled: boolean, connectionString: string): TelemetryService => {
    routerEvents$ = new Subject<unknown>();
    mockClient = {
      loadAppInsights: jest.fn(),
      addTelemetryInitializer: jest.fn(),
      trackPageView: jest.fn(),
      trackEvent: jest.fn(),
      trackMetric: jest.fn(),
      trackException: jest.fn(),
      flush: jest.fn(),
    };
    sdkLoaderMock = jest.fn().mockResolvedValue(mockClient);

    TestBed.configureTestingModule({
      providers: [
        TelemetryService,
        {
          provide: TELEMETRY_CONFIG,
          useValue: {
            enabled,
            connectionString,
            cloudRole: 'kinkconsentmanager-ui',
          },
        },
        { provide: TELEMETRY_SDK_LOADER, useValue: sdkLoaderMock },
        { provide: Router, useValue: { events: routerEvents$.asObservable() } },
      ],
    });

    return TestBed.inject(TelemetryService);
  };

  afterEach(() => {
    TestBed.resetTestingModule();
    jest.restoreAllMocks();
  });

  it('should stay disabled as a zero-overhead no-op when telemetry is disabled or connectionString is empty', async () => {
    const service = createService(false, '');
    await service.initialize();

    expect(service.isEnabled()).toBe(false);
    expect(sdkLoaderMock).not.toHaveBeenCalled();

    service.trackEvent('checklist_mode_selected', { mode: 'stepper' });
    service.trackMetric({ name: 'checklist_completion_percent', average: 50 });
    service.trackPageView({ name: '/checklist', uri: '/checklist' });
    service.trackException(new Error('ignored'));
    service.flush();
    expect(mockClient.trackEvent).not.toHaveBeenCalled();
  });

  it('should initialize SDK, track NavigationEnd AppPageViews without query params, and sanitize sensitive property keys', async () => {
    const service = createService(true, 'InstrumentationKey=test-key-only');
    await service.initialize();

    expect(service.isEnabled()).toBe(true);
    expect(sdkLoaderMock).toHaveBeenCalledWith('InstrumentationKey=test-key-only');
    expect(mockClient.loadAppInsights).toHaveBeenCalledTimes(1);
    expect(mockClient.addTelemetryInitializer).toHaveBeenCalledTimes(1);

    const initializer = mockClient.addTelemetryInitializer.mock.calls[0][0];
    const item = { name: 'evt', tags: {} as unknown[] } as unknown as Parameters<
      typeof initializer
    >[0];
    initializer(item);
    expect((item.tags as unknown as Record<string, string>)['ai.cloud.role']).toBe(
      'kinkconsentmanager-ui',
    );

    routerEvents$.next(
      new NavigationEnd(1, '/export?draft=secret#hash', '/export?draft=secret#hash'),
    );
    expect(mockClient.trackPageView).toHaveBeenCalledWith(
      { name: '/export', uri: '/export' },
      undefined,
    );

    service.trackEvent('export_completed', {
      format: 'pdf',
      answers: 'MUST_BE_STRIPPED',
      notes: 'MUST_BE_STRIPPED',
    });
    expect(mockClient.trackEvent).toHaveBeenCalledWith(
      { name: 'export_completed' },
      { format: 'pdf' },
    );

    service.trackMetric({
      name: 'export_duration_ms',
      average: 120,
      properties: { format: 'png' },
    });
    expect(mockClient.trackMetric).toHaveBeenCalledWith(
      { name: 'export_duration_ms', average: 120, sampleCount: 1 },
      { format: 'png' },
    );

    service.trackException(new Error('Unexpected PDF failure'), 3);
    expect(mockClient.trackException).toHaveBeenCalledWith({
      exception: expect.any(Error),
      severityLevel: 3,
    });
  });
});
