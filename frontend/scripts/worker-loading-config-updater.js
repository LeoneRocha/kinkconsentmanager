/**
 * Injeta configurações de delay do overlay de worker (`WORKER_LOADING_DELAY_MS`,
 * `WORKER_LOADING_START_DELAY_MS`, `WORKER_LOADING_COMPLETION_DELAY_MS`) no bloco `workerLoading`
 * em tempo de build quando definidas por variáveis de ambiente de CI/CD ou locais.
 */
const fs = require('fs');

function parseNonNegativeMs(rawValue) {
  if (rawValue === undefined || rawValue === null) {
    return null;
  }
  const trimmed = String(rawValue).trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function applyWorkerLoadingConfigContent(envContent, overrides = {}) {
  const blockRegex = /(workerLoading\s*:\s*\{[\s\S]*?\})/;
  if (!blockRegex.test(envContent)) {
    return { content: envContent, updated: false };
  }

  let updatedBlock = envContent.match(blockRegex)[1];
  let changed = false;

  const replaceNumericField = (fieldName, value) => {
    const parsed = parseNonNegativeMs(value);
    if (parsed === null) {
      return;
    }
    const fieldRegex = new RegExp(`(\\b${fieldName}\\s*:\\s*)\\d+`);
    if (fieldRegex.test(updatedBlock)) {
      updatedBlock = updatedBlock.replace(fieldRegex, `$1${parsed}`);
      changed = true;
    }
  };

  replaceNumericField('totalDelayMs', overrides.totalDelayMs);
  replaceNumericField('startDelayMs', overrides.startDelayMs);
  replaceNumericField('completionDelayMs', overrides.completionDelayMs);

  if (!changed) {
    return { content: envContent, updated: false };
  }

  return {
    content: envContent.replace(blockRegex, updatedBlock),
    updated: true,
  };
}

function updateWorkerLoadingConfig(envPath, envFile) {
  if (!fs.existsSync(envPath)) {
    return false;
  }

  const overrides = {
    totalDelayMs: process.env.WORKER_LOADING_DELAY_MS ?? process.env.APP_WORKER_LOADING_DELAY_MS,
    startDelayMs: process.env.WORKER_LOADING_START_DELAY_MS,
    completionDelayMs: process.env.WORKER_LOADING_COMPLETION_DELAY_MS,
  };

  const hasAnyOverride =
    parseNonNegativeMs(overrides.totalDelayMs) !== null ||
    parseNonNegativeMs(overrides.startDelayMs) !== null ||
    parseNonNegativeMs(overrides.completionDelayMs) !== null;

  if (!hasAnyOverride) {
    return false;
  }

  const raw = fs.readFileSync(envPath, 'utf8');
  const result = applyWorkerLoadingConfigContent(raw, overrides);
  if (result.updated) {
    fs.writeFileSync(envPath, result.content, 'utf8');
    console.log(`${envFile} workerLoading delays configured for build`);
    return true;
  }

  console.warn(`workerLoading block not found in ${envFile}`);
  return false;
}

module.exports = {
  applyWorkerLoadingConfigContent,
  parseNonNegativeMs,
  updateWorkerLoadingConfig,
};
