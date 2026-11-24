// Orquestrador para atualizar metadados de build em arquivos de environment:
// - Atualiza a versão amigável incremental (X.Y.Z, minor/patch 0..9) + buildDate (YYYY.MM.DD)
// - Gera/atualiza crypto.encryptionKeyBase64 quando autogeneredKeyBuildDeploy === true
// - Configura telemetry.connectionString via variável de ambiente de CI/CD quando definida

const path = require('path');
const { updateVersion } = require('./version-updater');
const { updateCryptoKey } = require('./crypto-key-updater');
const { updateTelemetryConfig } = require('./telemetry-config-updater');

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
