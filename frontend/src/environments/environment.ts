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
  readonly crypto: {
    readonly autogeneredKeyBuildDeploy: boolean;
    readonly encryptionKeyBase64: string;
  };
  readonly telemetry: AppTelemetryConfig;
}

export const environment: AppEnvironment = {
  production: false,
  appName: 'Kink Consent Manager',
  version: '1.0.4',
  buildDate: '2026.11.24',
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
