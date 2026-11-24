/**
 * Calcula a versão final amigável (X.Y.Z com virada 0..9 em minor/patch) a partir
 * da única fonte da verdade (`frontend/package.json` -> `version` e `versioning.baseBuildId`)
 * somada ao incremento do Build ID da pipeline de CI/CD, gravando apenas `src/environments/build-info.ts`.
 *
 * Exemplo com base 1.0.4 e baseBuildId 5774:
 *   local (sem buildId) -> 1.0.4 (buildId: 'local')
 *   5774 -> 1.0.4 | 5775 -> 1.0.5 | 5779 -> 1.0.9 | 5780 -> 1.1.0 | 5870 -> 2.0.0
 */
const fs = require('fs');
const path = require('path');

function formatBuildDate(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}`;
}

function parseFriendlyVersion(versionStr) {
  const match = /^\s*(\d+)\.(\d+)\.(\d+)\s*$/.exec(String(versionStr || ''));
  if (!match) {
    return [1, 0, 0];
  }

  let major = Number(match[1]);
  let minor = Number(match[2]);
  let patch = Number(match[3]);

  if (major === 0 && minor === 0 && patch === 0) {
    return [1, 0, 0];
  }

  if (patch > 9) {
    minor += Math.floor(patch / 10);
    patch %= 10;
  }
  if (minor > 9) {
    major += Math.floor(minor / 10);
    minor %= 10;
  }

  return [major, minor, patch];
}

function addFriendlyOffset(baseVersionStr, offset) {
  const [major, minor, patch] = parseFriendlyVersion(baseVersionStr);
  const safeOffset = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
  const total = major * 100 + minor * 10 + patch + safeOffset;
  const nextMajor = Math.floor(total / 100);
  const nextMinor = Math.floor((total % 100) / 10);
  const nextPatch = total % 10;
  return `${nextMajor}.${nextMinor}.${nextPatch}`;
}

function parsePositiveInt(rawValue) {
  if (rawValue === undefined || rawValue === null) {
    return null;
  }
  const trimmed = String(rawValue).trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function resolvePipelineBuildId(env = process.env, argv = process.argv) {
  for (const arg of argv) {
    if (typeof arg === 'string' && arg.startsWith('--build-id=')) {
      const cliBuildId = parsePositiveInt(arg.slice('--build-id='.length));
      if (cliBuildId !== null) {
        return { buildId: cliBuildId, source: '--build-id' };
      }
    }
  }

  const candidates = [
    ['BUILD_ID', env.BUILD_ID],
    ['BUILD_BUILDID', env.BUILD_BUILDID],
    ['GITHUB_RUN_NUMBER', env.GITHUB_RUN_NUMBER],
    ['CI_PIPELINE_IID', env.CI_PIPELINE_IID],
    ['CI_PIPELINE_ID', env.CI_PIPELINE_ID],
  ];

  for (const [source, rawValue] of candidates) {
    const parsed = parsePositiveInt(rawValue);
    if (parsed !== null) {
      return { buildId: parsed, source };
    }
  }

  return { buildId: null, source: null };
}

function calculateVersion({
  baseVersion,
  baseBuildId,
  pipelineBuildId,
  pipelineSource,
  forcedVersion,
  hasExplicitBaseOverride = false,
}) {
  const trimmedForced = typeof forcedVersion === 'string' ? forcedVersion.trim() : '';
  if (trimmedForced) {
    return {
      version: parseFriendlyVersion(trimmedForced).join('.'),
      buildId: pipelineBuildId !== null ? String(pipelineBuildId) : 'override',
      delta: 0,
    };
  }

  if (pipelineBuildId === null) {
    return {
      version: parseFriendlyVersion(baseVersion).join('.'),
      buildId: 'local',
      delta: 0,
    };
  }

  const isOneBasedRunCounter =
    pipelineSource === 'GITHUB_RUN_NUMBER' || pipelineSource === 'CI_PIPELINE_IID';
  const effectiveBase =
    isOneBasedRunCounter && !hasExplicitBaseOverride && pipelineBuildId < baseBuildId
      ? 1
      : baseBuildId;

  const delta = Math.max(0, pipelineBuildId - effectiveBase);
  return {
    version: addFriendlyOffset(baseVersion, delta),
    buildId: String(pipelineBuildId),
    delta,
  };
}

function readPackageVersionConfig(packageJsonPath) {
  if (!fs.existsSync(packageJsonPath)) {
    return { baseVersion: '1.0.0', baseBuildId: 1 };
  }
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const baseVersion = pkg.version || '1.0.0';
  const configBaseBuildId = parsePositiveInt(pkg.versioning?.baseBuildId) ?? 1;
  return { baseVersion, baseBuildId: configBaseBuildId };
}

function writeBuildInfoFile(buildInfoPath, { version, buildDate, buildId }) {
  const content =
    `// Gerado automaticamente por scripts/version-updater.js a partir de package.json + Build ID da pipeline.\n` +
    `export interface BuildInfo {\n` +
    `  readonly version: string;\n` +
    `  readonly buildDate: string;\n` +
    `  readonly buildId: string;\n` +
    `}\n\n` +
    `export const BUILD_INFO: BuildInfo = {\n` +
    `  version: '${version}',\n` +
    `  buildDate: '${buildDate}',\n` +
    `  buildId: '${buildId}',\n` +
    `};\n`;
  fs.writeFileSync(buildInfoPath, content, 'utf8');
}

function updateVersion(envPath, _envFile) {
  const envDir = path.dirname(envPath);
  const packageJsonPath = path.resolve(envDir, '../../package.json');
  const buildInfoPath = path.join(envDir, 'build-info.ts');

  const { baseVersion, baseBuildId: pkgBaseBuildId } = readPackageVersionConfig(packageJsonPath);
  const envBaseBuildId = parsePositiveInt(process.env.VERSION_BASE_BUILD_ID);
  const hasExplicitBaseOverride = envBaseBuildId !== null;
  const baseBuildId = envBaseBuildId ?? pkgBaseBuildId;

  const { buildId: pipelineBuildId, source: pipelineSource } = resolvePipelineBuildId();
  const resolved = calculateVersion({
    baseVersion,
    baseBuildId,
    pipelineBuildId,
    pipelineSource,
    forcedVersion: process.env.APP_VERSION,
    hasExplicitBaseOverride,
  });
  const buildDate = formatBuildDate();

  writeBuildInfoFile(buildInfoPath, {
    version: resolved.version,
    buildDate,
    buildId: resolved.buildId,
  });

  if (pipelineBuildId !== null) {
    console.log(
      `build-info.ts updated to ${resolved.version} (buildDate ${buildDate}, buildId ${resolved.buildId} via ${pipelineSource}, base ${baseVersion} @ ${baseBuildId})`,
    );
  } else {
    console.log(
      `build-info.ts updated to ${resolved.version} (buildDate ${buildDate}, local build from package.json)`,
    );
  }

  return resolved.version;
}

module.exports = {
  formatBuildDate,
  parseFriendlyVersion,
  addFriendlyOffset,
  parsePositiveInt,
  resolvePipelineBuildId,
  calculateVersion,
  readPackageVersionConfig,
  writeBuildInfoFile,
  updateVersion,
};
