import { BUILD_INFO } from './build-info';

export interface AppTelemetryConfig {
  readonly enabled: boolean;
  readonly connectionString: string;
  readonly cloudRole: string;
}

export interface AppEnvironment {
  readonly production: boolean;
  readonly appName: string;
  readonly version: string;
  readonly buildDate: string;
  readonly buildId: string;
  readonly crypto: {
    readonly autogeneredKeyBuildDeploy: boolean;
    readonly encryptionKeyBase64: string;
  };
  readonly telemetry: AppTelemetryConfig;
}

export const environment: AppEnvironment = {
  production: false,
  appName: 'Kink Consent Manager',
  version: BUILD_INFO.version,
  buildDate: BUILD_INFO.buildDate,
  buildId: BUILD_INFO.buildId,
  crypto: {
    autogeneredKeyBuildDeploy: false,
    encryptionKeyBase64: '',
  },
  telemetry: {
    enabled: false,
    connectionString: '',
    cloudRole: 'kinkconsentmanager-ui',
  },
};
