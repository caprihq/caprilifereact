const js = require('@eslint/js')
const tseslint = require('typescript-eslint')
const react = require('eslint-plugin-react')
const reactHooks = require('eslint-plugin-react-hooks')
const prettier = require('eslint-config-prettier')

/**
 * Lint config that mechanically enforces mobile/CODING_GUIDELINES.md.
 * A rule here should always trace back to a numbered rule in that document.
 */
module.exports = tseslint.config(
  { ignores: ['node_modules/**', 'ios/**', 'android/**', 'coverage/**', 'vendor/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettier,

  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: __dirname },
      globals: { console: 'readonly', fetch: 'readonly', __DEV__: 'readonly' },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',

      // §2.1 TypeScript strict
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',

      // §2.2 no classes
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ClassDeclaration',
          message:
            'Guidelines §2.2: no classes. Use functions and hooks. The only exception is a React error boundary.',
        },
      ],

      // §2.4 immutability
      'prefer-const': 'error',
      'no-var': 'error',
      'no-param-reassign': ['error', { props: true }],

      // §3.2 size limits
      'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': [
        'error',
        { max: 80, skipBlankLines: true, skipComments: true },
      ],
      'max-params': ['error', 3],
      complexity: ['warn', 12],

      // §5.1 never swallow an error
      'no-empty': ['error', { allowEmptyCatch: false }],

      // §5.3 no console on production paths — at all.
      //
      // `warn` and `error` used to be allowed, and the result was 31 call sites
      // doing `console.warn('[x] failed', error)`. React Native DevTools renders a
      // second argument as a collapsed `Object`, so those lines said "something
      // failed" and nothing else — and an Error does not even survive
      // JSON.stringify. Everything goes through logWarn/logError, which produce one
      // readable string with secrets redacted.
      'no-console': 'error',

      // §4.2 the theme is the only source of colour.
      //
      // Raw tokens are reachable only from src/theme (overridden below). Every
      // other file receives resolved roles — `theme.colors.primary` — so
      // changing a token changes every consumer. Dimensions (`size`,
      // `letterSpacing`, `fontSize`) stay importable from the '@/theme' barrel
      // because a module-level StyleSheet has no theme in scope and a size is a
      // constant, not a themed role.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/theme/tokens',
              message:
                'Guidelines §4.2: import resolved roles from the theme a style receives, not raw tokens. Only src/theme may read tokens directly.',
            },
            {
              // The session token must have exactly one home. A second writer is
              // how it ended up in plaintext App Group storage the first time.
              name: 'react-native-keychain',
              message:
                'Secrets go through services/storage/secretStore only — it is the single SecretStore, and it decides accessibility and access group.',
            },
          ],
          patterns: [
            {
              group: ['**/theme/tokens', '../tokens', './tokens'],
              message:
                'Guidelines §4.2: raw tokens are private to src/theme. Use theme.colors.* in a style factory.',
            },
          ],
        },
      ],
    },
  },

  // src/theme owns the tokens, so it is the one place allowed to import them.
  {
    files: ['src/theme/**'],
    rules: { 'no-restricted-imports': 'off' },
  },

  // secretStore IS the SecretStore, so it is the one place allowed to reach the
  // Keychain library directly.
  {
    files: ['src/services/storage/secretStore.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },

  // diag.ts IS the logger, so it is the one place allowed to call console.
  {
    files: ['src/utils/log/diag.ts'],
    rules: { 'no-console': 'off' },
  },

  // The drift-guard test asserts on literal palette values on purpose — it
  // exists to catch a token changing out from under the native config.
  {
    files: ['src/config/configConstants.test.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },

  // Tests may be longer and mock freely.
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**'],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },

  // Config files and the RN entry point run in Node/Metro and are not part
  // of the typed program.
  {
    files: ['*.config.js', '*.config.ts', 'index.js'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: { module: 'writable', require: 'readonly', __dirname: 'readonly' } },
    rules: { '@typescript-eslint/no-require-imports': 'off', 'no-undef': 'off' },
  },
)
