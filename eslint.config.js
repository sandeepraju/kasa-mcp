import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      // The SDK declares handlers as async; some don't need await internally
      '@typescript-eslint/require-await': 'off',
      // Allow void-returning async callbacks (e.g. event listeners, Express handlers)
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: false },
      ],
    },
  },
  // Test files — relax rules that are noise in test code
  {
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      // vitest's toHaveBeenCalled* matchers trigger this rule
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    ignores: ['build/**', 'node_modules/**', 'eslint.config.js', '.remember/**'],
  }
);
