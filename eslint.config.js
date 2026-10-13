import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.browser } } },
  { files: ['public/sw.js'], languageOptions: { globals: { ...globals.serviceworker } } },
  { files: ['*.config.{js,ts}', 'e2e/**'], languageOptions: { globals: { ...globals.node } } },
  {
    // src/core must stay pure so it runs in tests, workers and anywhere else.
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'localStorage',
        'sessionStorage',
        'navigator',
        'location',
      ],
    },
  },
);
