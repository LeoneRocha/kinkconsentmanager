export interface AppEnvironment {
  readonly production: boolean;
  readonly appName: string;
  readonly version: string;
  readonly buildDate: string;
  readonly crypto: {
    readonly autogeneredKeyBuildDeploy: boolean;
    readonly encryptionKeyBase64: string;
  };
}

export const environment: AppEnvironment = {
  production: false,
  appName: 'KinkConsentManager',
  version: '1.0.2',
  buildDate: '2026.11.23',
  crypto: {
    autogeneredKeyBuildDeploy: false,
    encryptionKeyBase64: '',
  },
};
