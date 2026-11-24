import { DestroyRef, InjectionToken, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import type { ITelemetryItem } from '@microsoft/applicationinsights-web';
import { filter } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TelemetryConfig {
  readonly enabled: boolean;
  readonly connectionString: string;
  readonly cloudRole: string;
}

export type TelemetryProperties = Record<string, string | number | boolean>;

export interface TelemetryPageView {
  readonly name: string;
  readonly uri?: string;
  readonly properties?: TelemetryProperties;
}

export interface TelemetryMetric {
  readonly name: string;
  readonly average: number;
  readonly sampleCount?: number;
  readonly min?: number;
  readonly max?: number;
  readonly properties?: TelemetryProperties;
}

export interface TelemetryClient {
  loadAppInsights(): void;
  addTelemetryInitializer(telemetryInitializer: (item: ITelemetryItem) => boolean | void): unknown;
  trackPageView(pageView: { name?: string; uri?: string }, customProperties?: Record<string, unknown>): void;
  trackEvent(event: { name: string }, customProperties?: Record<string, unknown>): void;
  trackMetric(
    metric: {
      name: string;
      average: number;
      sampleCount?: number;
      min?: number;
      max?: number;
    },
    customProperties?: Record<string, unknown>,
  ): void;
  trackException(exception: { exception: Error; severityLevel?: number }): void;
  flush(): void;
}

export type TelemetrySdkLoader = (connectionString: string) => Promise<TelemetryClient>;

const BLOCKED_PRIVACY_KEYS = new Set([
  'answers',
  'notes',
  'note',
  'draft',
  'payload',
  'rawcontent',
  'filecontent',
  'responses',
  'password',
  'token',
  'secret',
]);

export const TELEMETRY_CONFIG = new InjectionToken<TelemetryConfig>('TELEMETRY_CONFIG', {
  providedIn: 'root',
  factory: () => environment.telemetry,
});

export const TELEMETRY_SDK_LOADER = new InjectionToken<TelemetrySdkLoader>(
  'TELEMETRY_SDK_LOADER',
  {
    providedIn: 'root',
    factory: () => async (connectionString: string) => {
      const { ApplicationInsights } = await import('@microsoft/applicationinsights-web');
      return new ApplicationInsights({
        config: {
          connectionString,
          disableFetchTracking: false,
          enableAutoRouteTracking: false,
          autoTrackPageVisitTime: true,
        },
      });
    },
  },
);

/**
 * Servico desacoplado de telemetria (Azure Application Insights SDK JS).
 * Em conformidade com Privacidade Zero-Knowledge:
 * - Nao envia respostas, notas ou conteudos de rascunho JSON;
 * - Faz no-op silencioso quando `connectionString` nao esta configurada;
 * - Registra apenas `AppPageViews`, `AppEvents`, `AppMetrics` e excecoes sanitizadas.
 */
@Injectable({ providedIn: 'root' })
export class TelemetryService {
  private readonly config = inject(TELEMETRY_CONFIG);
  private readonly sdkLoader = inject(TELEMETRY_SDK_LOADER);
  private readonly router = inject(Router, { optional: true });
  private readonly destroyRef = inject(DestroyRef);

  private readonly _isEnabled = signal(false);
  readonly isEnabled = this._isEnabled.asReadonly();

  private client: TelemetryClient | null = null;
  private initPromise: Promise<void> | null = null;

  initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    const connStr = this.config.connectionString.trim();
    if (!this.config.enabled || !connStr) {
      this.initPromise = Promise.resolve();
      return this.initPromise;
    }

    this.initPromise = this.setupClient(connStr);
    return this.initPromise;
  }

  trackPageView(pageView: TelemetryPageView): void {
    if (!this.client) {
      return;
    }
    const cleanUri = pageView.uri ? this.sanitizeUri(pageView.uri) : undefined;
    const cleanProps = this.sanitizeProperties(pageView.properties);
    this.client.trackPageView({ name: pageView.name, uri: cleanUri }, cleanProps);
  }

  trackEvent(name: string, properties?: TelemetryProperties): void {
    if (!this.client) {
      return;
    }
    this.client.trackEvent({ name }, this.sanitizeProperties(properties));
  }

  trackMetric(metric: TelemetryMetric): void {
    if (!this.client || !Number.isFinite(metric.average)) {
      return;
    }
    this.client.trackMetric(
      {
        name: metric.name,
        average: metric.average,
        sampleCount: metric.sampleCount ?? 1,
        ...(typeof metric.min === 'number' ? { min: metric.min } : {}),
        ...(typeof metric.max === 'number' ? { max: metric.max } : {}),
      },
      this.sanitizeProperties(metric.properties),
    );
  }

  trackException(error: unknown, severityLevel = 3): void {
    if (!this.client) {
      return;
    }
    const normalizedError =
      error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error');
    this.client.trackException({
      exception: normalizedError,
      severityLevel,
    });
  }

  flush(): void {
    this.client?.flush();
  }

  private async setupClient(connectionString: string): Promise<void> {
    try {
      const sdkClient = await this.sdkLoader(connectionString);
      sdkClient.addTelemetryInitializer((item: ITelemetryItem) => {
        item.tags ??= [];
        const tagsRecord = item.tags as unknown as Record<string, string>;
        tagsRecord['ai.cloud.role'] = this.config.cloudRole || 'kinkconsentmanager-ui';
        tagsRecord['ai.application.ver'] = `${environment.version} (${environment.buildDate})`;
      });
      sdkClient.loadAppInsights();
      this.client = sdkClient;
      this._isEnabled.set(true);
      this.subscribeToRouterNavigation();
    } catch {
      this.client = null;
      this._isEnabled.set(false);
    }
  }

  private subscribeToRouterNavigation(): void {
    if (!this.router?.events) {
      return;
    }
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        const pathOnly = this.sanitizeUri(event.urlAfterRedirects);
        this.trackPageView({
          name: pathOnly,
          uri: pathOnly,
        });
      });
  }

  private sanitizeUri(rawUri: string): string {
    return rawUri.split(/[?#]/)[0] || '/';
  }

  private sanitizeProperties(
    properties?: TelemetryProperties,
  ): Record<string, string | number | boolean> | undefined {
    if (!properties) {
      return undefined;
    }
    const clean: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(properties)) {
      if (!BLOCKED_PRIVACY_KEYS.has(key.toLowerCase())) {
        clean[key] = value;
      }
    }
    return Object.keys(clean).length > 0 ? clean : undefined;
  }
}
