import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/.vite/**',
    // Preserve upstream skill sources and examples in both mirrored directories.
    '.agents/**',
    '.claude/**',
  ]),
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,tsx}'],
    extends: [js.configs.recommended],
  },
  {
    files: ['**/*.{ts,mts,cts,tsx}'],
    extends: [tseslint.configs.recommended],
  },
  {
    files: [
      'apps/api/**/*.ts',
      'scripts/**/*.mjs',
      '*.{mjs,mts}',
      'apps/web/vite.config.ts',
    ],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/web/{src,tests}/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
  },
  // Keep formatting in Prettier; this must follow the lint rule presets.
  prettier,
]);
