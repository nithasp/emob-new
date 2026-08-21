// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

/**
 * Flat config (ESLint 9) wired for Angular 18 via angular-eslint 18.
 *
 * `no-console` is enforced on its own account: all console output must go
 * through LoggerService (src/app/services/logger.service.ts) so that the nprod
 * and prod builds stay silent.
 *
 * On top of that the three recommended sets are enabled — eslint,
 * typescript-eslint and angular-eslint. Specs are held to `no-console: off`
 * only; every other rule applies to them as well.
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
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
    ],
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
      // A leading underscore marks something deliberately unused. Needed for
      // parameters a signature must keep — dropping one shifts every argument
      // after it and breaks callers silently.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // Specs are test code: they may report directly to the console, and their
    // mocks and spies are allowed to use `any`. Forcing fully typed doubles
    // tends to make a test assert the shape of its own fixture rather than the
    // behaviour under test. Every other rule still applies to them.
    files: ['**/*.spec.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
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
