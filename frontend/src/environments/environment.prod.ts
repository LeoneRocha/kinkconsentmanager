import { BUILD_INFO } from './build-info';

export const environment = {
  production: true,
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
