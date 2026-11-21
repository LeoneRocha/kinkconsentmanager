// @ts-check
import { defineConfig } from 'rolldown';
import { getComptimeReplacements } from "comptime.ts/api";
import MagicString from "magic-string";
import { readFile } from "node:fs/promises";
import { createFilter } from '@rollup/pluginutils';

/**
 * @template T
 * @typedef {T | Promise<T>} MaybePromise
 */

/**
 * @typedef {(specifier: string, importer: string) => MaybePromise<string | null | undefined>} ModuleResolver
 */

/**
 * @typedef {Object} BaseConfig
 * @property {ModuleResolver} [resolver]
 */

/**
 * @typedef {BaseConfig} ConfigByConfig
 * @property {string} rootDir
 * @property {import('typescript').CompilerOptions} tsconfig
 * @property {never} [tsConfigPath]
 */

/**
 * @typedef {BaseConfig} ConfigByPath
 * @property {string} tsConfigPath
 * @property {never} [rootDir]
 */

/**
 * @typedef {BaseConfig} ConfigByImplicitConfig
 * @property {string} tsconfigPath
 * @property {never} [rootDir]
 * @property {never} [tsConfigPath]
 */

/**
 * @typedef {ConfigByConfig | ConfigByPath | ConfigByImplicitConfig} GetComptimeReplacementsOpts
 */

/**
 * @typedef {ReadonlyArray<string | RegExp> | string | RegExp | null} FilterPattern
 */

/**
 * @typedef {GetComptimeReplacementsOpts & { include?: FilterPattern; exclude?: FilterPattern; }} ComptimeVitePluginOpts
 */

/**
 * @param {ComptimeVitePluginOpts} [opts]
 * @returns {import('rolldown').Plugin}
 */
function comptime(opts) {
  const filter = createFilter(opts?.include, opts?.exclude);

  /** @type {((specifier: string, importer: string) => Promise<string | undefined>)} */
  let resolver;
  /** @type {import('comptime.ts/api').Replacements} */
  let replacements;

  return {
    name: "vite-plugin-comptime",
    async buildStart() {
      resolver = (specifier, importer) => this.resolve(specifier, importer).then(res => res?.id);

      replacements = await getComptimeReplacements({ ...opts, resolver, filter });
    },
    async load(id) {
      const replacement = replacements[id];
      if (!replacement) return null;

      const mod = await readFile(id, "utf-8");

      const s = new MagicString(mod);

      for (const r of replacement) {
        s.overwrite(r.start, r.end, r.replacement);
      }

      return { code: s.toString(), map: s.generateMap() };
    },
  };
}

export default defineConfig({
  input: 'public/main.tsx',
  tsconfig: 'public/tsconfig.json',
  output: {
    file: 'public/kinklist.js',
    format: 'iife',
    generatedCode: {
      preset: 'es5'
    },
    sourcemap: 'inline'
  },
  // Incompatible with watch mode
  // plugins: [comptime({
  //   tsconfigPath: 'public/tsconfig.json',
  // })],
  platform: 'browser',
  transform: {
    jsx: {
      runtime: 'automatic',
      importSource: 'preact'
    }
  },
  resolve: {
    alias: {
      "react": "preact/compat",
      "react-dom/test-utils": "preact/test-utils",
      "react-dom": "preact/compat",
      "react/jsx-runtime": "preact/jsx-runtime"
    }
  }
});