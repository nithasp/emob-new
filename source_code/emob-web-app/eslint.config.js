// @ts-check
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

/**
 * Flat config (ESLint 9) wired for Angular 18 via angular-eslint 18.
 *
 * The single enforced rule is `no-console`: all console output must go through
 * LoggerService (src/app/services/logger.service.ts) so that the nprod and prod
 * builds stay silent. The Angular/TypeScript plugins are registered here so the
 * team can switch on the recommended rule sets later without re-plumbing ESLint.
 */
module.exports = tseslint.config(
  {
    ignores: [
      'dist/**',
      '.angular/**',
      'node_modules/**',
      'playwright-report/**',
      'playwright-artifacts/**',
    ],
  },
  {
    files: ['**/*.ts'],
    plugins: {
      '@angular-eslint': angular.tsPlugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    processor: angular.processInlineTemplates,
    rules: {
      'no-console': 'error',
    },
  },
  {
    // Specs are test code and may report directly to the console.
    files: ['**/*.spec.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.html'],
    plugins: {
      '@angular-eslint/template': angular.templatePlugin,
    },
    languageOptions: {
      parser: angular.templateParser,
    },
    rules: {},
  },
);
