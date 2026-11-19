// Общая база ESLint для пакетов на TypeScript. Пакеты расширяют её в своих eslint.config.mjs.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export const base = tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', '**/.angular/**', 'packages/api-client/src/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);

export default base;
