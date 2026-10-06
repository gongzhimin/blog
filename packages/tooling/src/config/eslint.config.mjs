export default [
  { ignores: ['node_modules/**', 'dist/**', '.astro/**', 'public/vendor/**'] },
  {
    files: [
      'packages/**/*.mjs',
      'packages/**/*.js',
      'packages/**/*.cjs',
      'tests/**/*.mjs',
      'tests/**/*.cjs',
    ],
    languageOptions: { ecmaVersion: 'latest' },
    rules: {
      'constructor-super': 'error',
      'no-dupe-args': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-invalid-regexp': 'error',
      'no-unreachable': 'error',
      'valid-typeof': 'error',
      'no-unsafe-finally': 'error',
    },
  },
  { files: ['**/*.cjs'], languageOptions: { sourceType: 'commonjs' } },
];
