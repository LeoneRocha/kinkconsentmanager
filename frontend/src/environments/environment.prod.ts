import { BUILD_INFO } from './build-info';

export interface AppWorkerLoadingConfig {
  readonly totalDelayMs: number;
  readonly startDelayMs: number;
  readonly completionDelayMs: number;
  readonly progressTickMs: number;
  readonly virtualProgressCap: number;
}

export const environment = {
  production: true,
  appName: 'Kink Consent Manager',
  apiBaseUrl: 'https://kinkconsentmanagerappapi-b7eaezc7cbhxftfb.brazilsouth-01.azurewebsites.net',
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
  workerLoading: {
    totalDelayMs: 3000,
    startDelayMs: 350,
    completionDelayMs: 650,
    progressTickMs: 40,
    virtualProgressCap: 92,
  },
};
