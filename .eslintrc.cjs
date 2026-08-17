module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
  overrides: [
    {
      // Design-system primitives follow the upstream shadcn/base-ui convention of
      // co-exporting a component with its `cva` variants or its context hook via a
      // trailing `export { ... }` block. `allowConstantExport` only understands
      // `export const`, so the rule misfires here. Fast-refresh granularity inside
      // the design system is not worth splitting every primitive in two.
      files: ['src/components/ui/**/*.{ts,tsx}'],
      rules: {
        'react-refresh/only-export-components': 'off',
      },
    },
    {
      // Tier direction (docs/working-conventions.md): the design system is the
      // bottom layer. It may use `@/lib` helpers and other `ui` primitives, but it
      // must never reach up into feature components or pages.
      files: ['src/components/ui/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  '@/pages/*',
                  '@/components/*',
                  '!@/components/ui',
                  '!@/components/ui/**',
                ],
                message:
                  'src/components/ui is the bottom layer: it must not import feature components or pages. Move the shared piece into src/components/ui or src/lib instead.',
              },
            ],
          },
        ],
      },
    },
  ],
}
