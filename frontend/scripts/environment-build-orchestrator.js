// Orquestrador para atualizar metadados de build em arquivos de environment:
// - Calcula versão amigável (X.Y.Z, minor/patch 0..9) + buildDate + buildId em src/environments/build-info.ts
//   a partir de package.json (fonte única) + Build ID da pipeline de CI/CD
// - Gera/atualiza crypto.encryptionKeyBase64 quando autogeneredKeyBuildDeploy === true
// - Configura telemetry.connectionString via variável de ambiente de CI/CD quando definida

const path = require('path');
const { updateVersion } = require('./version-updater');
const { updateCryptoKey } = require('./crypto-key-updater');
const { updateTelemetryConfig } = require('./telemetry-config-updater');
const { updateWorkerLoadingConfig } = require('./worker-loading-config-updater');

let env = null;
for (const arg of process.argv) {
  if (arg.startsWith('--env=')) {
    env = arg.split('=')[1].toLowerCase();
    break;
  }
  if (arg.startsWith('--') && arg.length > 2) {
    const possibleEnv = arg.slice(2).toLowerCase();
    if (['prod', 'production', 'staging', 'qa', 'dev', 'test'].includes(possibleEnv)) {
      env = possibleEnv === 'production' ? 'prod' : possibleEnv;
      break;
    }
  }
}

const envFile = env ? `environment.${env}.ts` : 'environment.ts';
const envPath = path.resolve(__dirname, `../src/environments/${envFile}`);

// Passo 1: atualizar versão dinâmica amigável e data de build
updateVersion(envPath, envFile);

// Passo 2: atualizar/gerar chave de criptografia se habilitado
updateCryptoKey(envPath, envFile);

// Passo 3: injetar Application Insights Connection String se configurada no ambiente de CI/CD
updateTelemetryConfig(envPath, envFile);

// Passo 4: ajustar delays do loading de workers caso definidos via variável de ambiente
updateWorkerLoadingConfig(envPath, envFile);
