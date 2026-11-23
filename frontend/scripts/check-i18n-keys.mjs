import fs from 'fs';
import path from 'path';

const i18nDir = path.resolve('src/assets/i18n');
const locales = ['pt-BR', 'en-US'];

const localeUiKeys = Object.fromEntries(
  locales.map((locale) => {
    const json = JSON.parse(fs.readFileSync(path.join(i18nDir, `${locale}.json`), 'utf8'));
    return [locale, new Set(Object.keys(json.ui ?? {}))];
  }),
);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', 'coverage', 'scripts'].includes(entry.name)) {
        walk(full, files);
      }
    } else if (/\.(html|ts)$/.test(entry.name) && !entry.name.endsWith('.spec.ts')) {
      files.push(full);
    }
  }
  return files;
}

const keyPatterns = [
  /['"`]([a-zA-Z0-9_]+)['"`]\s*\|\s*schemaTranslate\s*:\s*['"`]ui['"`]/g,
  /translateUi\s*\(\s*['"`]([a-zA-Z0-9_]+)['"`]/g,
];

const usedKeys = new Map();
for (const file of walk(path.resolve('src/app'))) {
  const content = fs.readFileSync(file, 'utf8');
  for (const re of keyPatterns) {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(content))) {
      const key = match[1];
      if (!usedKeys.has(key)) {
        usedKeys.set(key, new Set());
      }
      usedKeys.get(key).add(file.replace(/\\/g, '/'));
    }
  }
}

const allUsed = [...usedKeys.keys()].sort();
console.log(`Total static ui keys detected in templates/TS: ${allUsed.length}`);

let hasIssues = false;

for (const locale of locales) {
  const missing = allUsed.filter((key) => !localeUiKeys[locale].has(key));
  console.log(`Missing static ui keys in ${locale}: ${missing.length}`);
  if (missing.length > 0) {
    hasIssues = true;
    for (const key of missing) {
      console.log(`  - ${key}`);
    }
  }
}

for (const locale of locales.filter((l) => l !== 'pt-BR')) {
  const onlyInPt = [...localeUiKeys['pt-BR']].filter((key) => !localeUiKeys[locale].has(key)).sort();
  if (onlyInPt.length > 0) {
    hasIssues = true;
    console.log(`In pt-BR ui but missing in ${locale}: ${onlyInPt.length}`);
    onlyInPt.forEach((key) => console.log(`  - ${key}`));
  }

  const onlyInOther = [...localeUiKeys[locale]].filter((key) => !localeUiKeys['pt-BR'].has(key)).sort();
  if (onlyInOther.length > 0) {
    hasIssues = true;
    console.log(`In ${locale} ui but missing in pt-BR: ${onlyInOther.length}`);
    onlyInOther.forEach((key) => console.log(`  - ${key}`));
  }
}

if (hasIssues) {
  process.exitCode = 1;
} else {
  console.log('All ui i18n keys are synchronized between pt-BR and en-US.');
}
