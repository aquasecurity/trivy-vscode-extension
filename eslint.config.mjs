import pluginJs from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
  // Global settings
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Basic JS configurations
  pluginJs.configs.recommended,

  // TypeScript configurations
  ...tseslint.configs.recommended,

  // Import plugin configuration
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      // Module systems
      'import/no-unresolved': 'error',
      'import/named': 'error',
      'import/default': 'error',
      'import/namespace': 'error',
      'import/export': 'error',

      // Style guide
      'import/first': 'error',
      'import/no-duplicates': 'error',
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // Helpful warnings
      'import/no-mutable-exports': 'error',

      // Module systems
      'import/no-commonjs': 'off', // Enable if you want to enforce ES modules only
      'import/no-amd': 'error',

      // Static analysis
      'import/no-deprecated': 'warn',
      'import/no-extraneous-dependencies': 'error', // This will check for unused dependencies
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.ts', '.d.ts'],
        },
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
      'import/extensions': ['.js', '.mjs', '.ts'],
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts'],
      },
    },
  },
];
