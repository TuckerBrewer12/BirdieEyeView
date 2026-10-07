import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import golf from './eslint/golf.js'
import kit from './eslint/kit.js'

export default defineConfig([
  globalIgnores(['dist', 'playwright-report', 'test-results', 'playwright/.cache']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // Code a React Native app will share: return plain data, never web UI or browser APIs.
    files: [
      'src/domain/**/*.ts',
      'src/data/**/*.ts',
      'src/types/**/*.ts',
      'src/hooks/*.ts',
      'src/lib/api.ts',
      'src/lib/apiBase.ts',
      'src/lib/auth.ts',
      'src/lib/sessionToken.ts',
      'src/pages/**/model.ts',
      'src/pages/**/*Model.ts',
      'src/pages/**/*Repository.ts',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'react-dom', message: 'Shared code cannot render web UI.' },
          { name: 'react-router', message: 'Take navigation callbacks instead of routing.' },
          { name: 'react-router-dom', message: 'Take navigation callbacks instead of routing.' },
        ],
        patterns: [
          {
            group: ['@/brand', '@/brand/*', '**/brand', '**/brand/*'],
            message: 'The brand kit is web-only. Return semantic values (score keys, numbers) and let the view paint them.',
          },
          {
            group: ['@/components', '@/components/*', '**/components/*'],
            message: 'Shared code cannot import web components.',
          },
          {
            group: ['@capacitor/*'],
            message: 'Put native APIs behind an adapter the app passes in.',
          },
        ],
      }],
      'no-restricted-globals': ['error',
        { name: 'window', message: 'Put browser APIs behind an adapter the app passes in.' },
        { name: 'document', message: 'Put browser APIs behind an adapter the app passes in.' },
        { name: 'localStorage', message: 'Use a storage adapter the app passes in.' },
        { name: 'sessionStorage', message: 'Use a storage adapter the app passes in.' },
      ],
      'no-restricted-syntax': ['error', {
        selector: "MetaProperty[meta.name='import'][property.name='meta']",
        message: 'import.meta is Vite-only. Read config at the app edge and pass it in.',
      }],
    },
  },
  {
    // Golf rules and score paint have one home each: the server and domain/ for figures and
    // rules, brand/theme/score.ts for words and colour. Colours and lengths come from
    // brand/theme/tokens.css. On for the kit and the pages already moved onto it; each page
    // joins this list as it is refactored.
    files: [
      'src/brand/**/*.{ts,tsx}',
      'src/pages/dashboard/**/*.{ts,tsx}',
      'src/pages/landing-page/**/*.{ts,tsx}',
      'src/pages/courses/**/*.{ts,tsx}',
      'src/pages/rounds/**/*.{ts,tsx}',
    ],
    ignores: [
      // The homes these rules point to: score words, paint and token mirrors.
      'src/brand/theme/**',
      // Tests build fixtures and fake server figures on purpose.
      '**/tests/**',
      '**/*.test.{ts,tsx}',
    ],
    plugins: { golf, kit },
    rules: {
      'golf/no-score-kind-table': 'error',
      'golf/no-to-par-branch': 'error',
      'golf/no-golf-math': 'error',
      'golf/no-shadowed-golf-type': 'error',
      'kit/no-arbitrary-value': 'error',
      'kit/no-color-literal': 'error',
    },
  },
])
