/**
 * Atualiza dinamicamente a versão amigável (X.Y.Z com 1 casa decimal em minor/patch: 0..9)
 * e a data de build (YYYY.MM.DD) nos arquivos de environment, mantendo `package.json` sincronizado.
 * Progressão: 1.0.0 -> 1.0.1 -> ... -> 1.0.9 -> 1.1.0 -> ... -> 1.9.9 -> 2.0.0 -> 2.0.1
 */
const fs = require('fs');
const path = require('path');

const VERSION_PATTERN = /(\bversion:\s*)(['"])([^'"]*)\2([,;])/;
const BUILD_DATE_PATTERN = /(\bbuildDate:\s*)(['"])([^'"]*)\2([,;])/;

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

function incrementFriendlyVersion(currentVersion) {
  const [major, minor, patch] = parseFriendlyVersion(currentVersion);
  const total = major * 100 + minor * 10 + patch + 1;
  const nextMajor = Math.floor(total / 100);
  const nextMinor = Math.floor((total % 100) / 10);
  const nextPatch = total % 10;
  return `${nextMajor}.${nextMinor}.${nextPatch}`;
}

function compareVersions(a, b) {
  const [aMaj, aMin, aPat] = parseFriendlyVersion(a);
  const [bMaj, bMin, bPat] = parseFriendlyVersion(b);
  return aMaj * 100 + aMin * 10 + aPat - (bMaj * 100 + bMin * 10 + bPat);
}

function readEnvVersion(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const match = VERSION_PATTERN.exec(content);
  return match ? match[3] : null;
}

function readPackageVersion(packageJsonPath) {
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return pkg.version || null;
}

function writeEnvMetadata(filePath, nextVersion, buildDate) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  if (!VERSION_PATTERN.test(content)) {
    return false;
  }
  content = content.replace(VERSION_PATTERN, `$1'${nextVersion}'$4`);
  if (BUILD_DATE_PATTERN.test(content)) {
    content = content.replace(BUILD_DATE_PATTERN, `$1'${buildDate}'$4`);
  }
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

function writePackageVersion(packageJsonPath, nextVersion) {
  if (!fs.existsSync(packageJsonPath)) {
    return;
  }
  const raw = fs.readFileSync(packageJsonPath, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const pkg = JSON.parse(raw);
  pkg.version = nextVersion;
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}${eol}`, 'utf8');
}

function updateVersion(envPath, envFile) {
  if (!fs.existsSync(envPath)) {
    console.error(`Environment file not found: ${envPath}`);
    process.exitCode = 1;
    return null;
  }

  const envDir = path.dirname(envPath);
  const packageJsonPath = path.resolve(envDir, '../../package.json');
  const candidateFiles = [
    envPath,
    path.join(envDir, 'environment.ts'),
    path.join(envDir, 'environment.prod.ts'),
  ];

  const candidates = [];
  for (const file of new Set(candidateFiles)) {
    const v = readEnvVersion(file);
    if (v && v !== '0.0.0') {
      candidates.push(v);
    }
  }
  const pkgVer = readPackageVersion(packageJsonPath);
  if (pkgVer && pkgVer !== '0.0.0') {
    candidates.push(pkgVer);
  }

  let baseVersion = '1.0.0';
  for (const candidate of candidates) {
    if (compareVersions(candidate, baseVersion) > 0) {
      baseVersion = candidate;
    }
  }

  const forcedVersion = process.env.APP_VERSION?.trim();
  const buildVersion = forcedVersion
    ? parseFriendlyVersion(forcedVersion).join('.')
    : incrementFriendlyVersion(baseVersion);
  const buildDate = formatBuildDate();

  let updatedPrimary = false;
  for (const file of new Set(candidateFiles)) {
    const ok = writeEnvMetadata(file, buildVersion, buildDate);
    if (file === envPath) {
      updatedPrimary = ok;
    }
  }
  writePackageVersion(packageJsonPath, buildVersion);

  if (updatedPrimary) {
    console.log(`${envFile} version updated to ${buildVersion} (build ${buildDate})`);
  } else {
    console.error(`Version property not found in ${envFile}`);
  }

  return buildVersion;
}

module.exports = {
  formatBuildDate,
  parseFriendlyVersion,
  incrementFriendlyVersion,
  compareVersions,
  updateVersion,
};
