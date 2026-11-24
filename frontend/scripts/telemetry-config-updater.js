/**
 * Injeta APPLICATIONINSIGHTS_CONNECTION_STRING no bloco `telemetry` em tempo de build
 * (quando definida em variável de ambiente de CI/CD), mantendo zero segredos commitados no Git.
 */
const fs = require('fs');

function applyTelemetryConfigContent(envContent, connectionString) {
  const sanitized = String(connectionString || '').trim();
  if (!sanitized) {
    return { content: envContent, updated: false };
  }

  const telemetryBlockRegex =
    /(telemetry\s*:\s*\{[\s\S]*?\benabled\s*:\s*)(true|false)([\s\S]*?\bconnectionString\s*:\s*)(['"])[^'"]*\4([\s\S]*?\})/;

  if (!telemetryBlockRegex.test(envContent)) {
    return { content: envContent, updated: false };
  }

  const escaped = sanitized.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const updatedContent = envContent.replace(
    telemetryBlockRegex,
    `$1true$3'${escaped}'$5`,
  );
  return { content: updatedContent, updated: true };
}

function updateTelemetryConfig(envPath, envFile) {
  if (!fs.existsSync(envPath)) {
    return false;
  }

  const connectionString =
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ||
    process.env.APPINSIGHTS_CONNECTION_STRING ||
    '';

  if (!connectionString.trim()) {
    return false;
  }

  const raw = fs.readFileSync(envPath, 'utf8');
  const result = applyTelemetryConfigContent(raw, connectionString);
  if (result.updated) {
    fs.writeFileSync(envPath, result.content, 'utf8');
    console.log(`${envFile} telemetry.connectionString configured for build`);
    return true;
  }

  console.warn(`telemetry block not found in ${envFile}`);
  return false;
}

module.exports = { applyTelemetryConfigContent, updateTelemetryConfig };
