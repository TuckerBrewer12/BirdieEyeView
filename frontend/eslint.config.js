import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import playwright from 'eslint-plugin-playwright'
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import golf from './eslint/golf.js'
import kit from './eslint/kit.js'
import specs from './eslint/specs.js'

// A later block's setting for a rule replaces an earlier one's for the files both match, so
// the lists of restricted syntax and imports are built from these pieces in every block that
// sets them.

/** Colour-blind mode is being removed; nothing new should reach for it. */
const NO_COLOR_BLIND = [{
  selector: 'Identifier[name=/colou?r_?blind/i]',
  message: 'Colour-blind mode is being removed. Paint scores from the brand tokens instead of a colour-blind palette.',
}]

/** Looks come from tokens and `dark:` variants; useTheme() is only for toggling and saving the choice. */
const THEME_IS_CSS = [
  {
    selector: "VariableDeclarator[init.callee.name='useTheme'] > ObjectPattern > Property[key.name='resolved']",
    message: 'Read the theme in CSS (`dark:` variants, tokens), not in JS. useTheme() is for toggling and saving the choice.',
  },
  {
    selector: "MemberExpression[object.callee.name='useTheme'][property.name='resolved']",
    message: 'Read the theme in CSS (`dark:` variants, tokens), not in JS. useTheme() is for toggling and saving the choice.',
  },
  {
    selector: "CallExpression[callee.property.name='contains'][arguments.0.value='dark']",
    message: "Checking for the `dark` class paints in JS. Use a `dark:` variant or a token, which follow the theme on their own.",
  },
]

/** A request that skips the typed client in lib/api.ts and the generated types behind it. */
const NO_RAW_API_FETCH = [{
  selector: "CallExpression[callee.name='fetch'] > CallExpression.arguments[callee.name='apiUrl']",
  message: 'Call the API through src/lib/api.ts so the request and response use the generated types.',
}]

const IMPORT_META = [{
  selector: "MetaProperty[meta.name='import'][property.name='meta']",
  message: 'import.meta is Vite-only. Read config at the app edge and pass it in.',
}]

/** Work a view model should hand over finished: views only lay out what they're given. */
const VIEW_SHAPING = [
  {
    selector: "JSXExpressionContainer CallExpression[callee.property.name=/^(sort|toSorted|reverse|toReversed)$/]",
    message: 'Sorting in JSX hides an ordering rule in the view. Have the view model hand over the rows in order.',
  },
  {
    selector: "JSXExpressionContainer CallExpression[callee.property.name=/^(map|flatMap)$/][callee.object.callee.property.name=/^(filter|sort|toSorted|slice|map|reduce)$/]",
    message: 'A chain of array steps in JSX builds data in the view. Have the view model hand over the finished list and map over it once.',
  },
  {
    selector: 'JSXExpressionContainer TSNonNullExpression',
    message: 'A `!` in JSX means the view is guessing at state. Have the view model hand over a value the view can render as is.',
  },
  {
    selector: "JSXExpressionContainer CallExpression[callee.property.name=/^(toFixed|toPrecision)$/], JSXExpressionContainer CallExpression[callee.object.name='Math'][callee.property.name='round']",
    message: 'Number formatting in JSX gets copied between views. Use a formatter from domain/ or the page’s presenter.',
  },
]

/** Native controls the kit already wraps, with its focus, sizing and dark-mode styles. */
const NO_RAW_CONTROLS = [{
  selector: 'JSXOpeningElement[name.name=/^(button|input|select|textarea)$/]',
  message: 'Use the kit’s control (Button, Input, InputGroup, ToggleGroup, SortControl from @/brand) instead of a raw element.',
}]

/** Refactored pages and the kit never reach back into the legacy tree. */
const NO_LEGACY_COMPONENTS = {
  group: ['@/components', '@/components/*', '**/src/components/**'],
  message: 'Refactored pages and the kit never import from src/components. Use the kit (@/brand), or port the piece into the kit first.',
}

/** Kit components and page components take domain types; the API's shapes stop at the data layer. */
const NO_API_TYPES_IN_COMPONENTS = {
  group: ['@/types/api', '@/types/api.gen', '@/types/golf'],
  message: 'Components take the domain’s types (@/domain), not the API’s. Map the response in the repository or view model.',
}

/** Files that the brand kit's and golf rules cover. Each page joins this list as it is refactored. */
const REFACTORED = [
  'src/brand/**/*.{ts,tsx}',
  'src/pages/dashboard/**/*.{ts,tsx}',
  'src/pages/landing-page/**/*.{ts,tsx}',
  'src/pages/courses/**/*.{ts,tsx}',
  'src/pages/rounds/**/*.{ts,tsx}',
]
const REFACTORED_IGNORES = [
  // The homes these rules point to: score words, paint and token mirrors.
  'src/brand/theme/**',
  // Tests build fixtures and fake server figures on purpose.
  '**/tests/**',
  '**/*.test.{ts,tsx}',
  '**/*Test.{ts,tsx}',
]

export default defineConfig([
  globalIgnores(['dist', 'playwright-report', 'test-results', 'playwright/.cache']),
  {
    linterOptions: {
      // A disable comment that no longer disables anything is a stale exemption.
      reportUnusedDisableDirectives: 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      comments.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // A disable comment says why, so a reviewer can tell a real exception from a silenced error.
      '@eslint-community/eslint-comments/require-description': 'error',
    },
  },
  {
    files: ['src/**/*.tsx'],
    extends: [jsxA11y.flatConfigs.recommended],
  },
  {
    // Rules that need the type checker. Each one has caught a real bug class in this repo.
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // An un-awaited save or refetch fails silently.
      '@typescript-eslint/no-floating-promises': 'error',
      // An async handler passed where a void callback is expected swallows its rejection.
      '@typescript-eslint/no-misused-promises': 'error',
      // A new score kind or tee colour has to be handled everywhere it's switched on.
      '@typescript-eslint/switch-exhaustiveness-check': ['error', { considerDefaultExhaustiveForUnions: true }],
      // `if (putts)` and `strokes ? … : "—"` treat a real 0 as missing. Only nullable numbers are checked.
      '@typescript-eslint/strict-boolean-expressions': ['error', {
        allowString: true,
        allowNumber: true,
        allowNullableObject: true,
        allowNullableBoolean: true,
        allowNullableString: true,
        allowNullableEnum: true,
        allowAny: true,
        allowNullableNumber: false,
      }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', ...NO_COLOR_BLIND, ...THEME_IS_CSS, ...NO_RAW_API_FETCH],
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['@/lib/accessibility', '@/lib/chartPalettes', '**/lib/accessibility', '**/lib/chartPalettes'],
          message: 'Colour-blind mode is being removed. Paint scores from the brand tokens instead.',
        }],
      }],
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
          {
            group: ['@/lib/accessibility', '@/lib/chartPalettes', '**/lib/accessibility', '**/lib/chartPalettes'],
            message: 'Colour-blind mode is being removed. Paint scores from the brand tokens instead.',
          },
        ],
      }],
      'no-restricted-globals': ['error',
        { name: 'window', message: 'Put browser APIs behind an adapter the app passes in.' },
        { name: 'document', message: 'Put browser APIs behind an adapter the app passes in.' },
        { name: 'localStorage', message: 'Use a storage adapter the app passes in.' },
        { name: 'sessionStorage', message: 'Use a storage adapter the app passes in.' },
      ],
      'no-restricted-syntax': ['error', ...IMPORT_META, ...NO_COLOR_BLIND, ...THEME_IS_CSS, ...NO_RAW_API_FETCH],
    },
  },
  {
    // Golf rules and score paint have one home each: the server and domain/ for figures and
    // rules, brand/theme/score.ts for words and colour. Colours, lengths and motion come from
    // brand/theme. On for the kit and the pages already moved onto it.
    files: REFACTORED,
    ignores: REFACTORED_IGNORES,
    plugins: { golf, kit },
    rules: {
      'golf/no-score-kind-table': 'error',
      'golf/no-to-par-branch': 'error',
      'golf/no-golf-math': 'error',
      'golf/no-shadowed-golf-type': 'error',
      'golf/no-par-fallback': 'error',
      'kit/no-arbitrary-value': 'error',
      'kit/no-color-literal': 'error',
      'kit/no-opacity-wash': 'error',
      'kit/no-fraction-size': 'error',
      'kit/no-raw-motion': 'error',
      'kit/no-style-measure': 'error',
      'kit/no-measure-prop': 'error',
      // A different rule id from no-restricted-imports, so it doesn't replace the shared-code list above.
      '@typescript-eslint/no-restricted-imports': ['error', { patterns: [NO_LEGACY_COMPONENTS] }],
    },
  },
  {
    // Views in the refactored pages: lay out what the view model hands over, with kit controls.
    files: REFACTORED.map((glob) => glob.replace('{ts,tsx}', 'tsx')),
    ignores: [...REFACTORED_IGNORES, 'src/brand/components/**'],
    rules: {
      'no-restricted-syntax': ['error', ...NO_COLOR_BLIND, ...THEME_IS_CSS, ...NO_RAW_API_FETCH, ...VIEW_SHAPING, ...NO_RAW_CONTROLS],
    },
  },
  {
    // The kit's own components wrap the native controls, so only the view rules apply.
    files: ['src/brand/components/**/*.tsx'],
    ignores: REFACTORED_IGNORES,
    rules: {
      'no-restricted-syntax': ['error', ...NO_COLOR_BLIND, ...THEME_IS_CSS, ...NO_RAW_API_FETCH, ...VIEW_SHAPING],
    },
  },
  {
    files: ['src/brand/**/*.{ts,tsx}', 'src/pages/**/components/**/*.{ts,tsx}'],
    ignores: REFACTORED_IGNORES,
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', { patterns: [NO_LEGACY_COMPONENTS, NO_API_TYPES_IN_COMPONENTS] }],
    },
  },
  {
    // Playwright specs and robots: screenshot specs check looks, espresso specs check behaviour.
    files: ['src/**/*.spec.ts', 'src/**/*.robot.ts'],
    extends: [playwright.configs['flat/recommended']],
    plugins: { specs },
    rules: {
      // Robot steps (`seesX`, `capture`) hold the assertions, so a spec that calls them asserts.
      'playwright/expect-expect': ['error', { assertFunctionPatterns: ['^sees', '^doesNotSee', '^isAt', '^goesTo', '^capture', '^expect'] }],
    },
  },
  {
    files: ['src/pages/**/*.screenshot.spec.ts'],
    plugins: { specs },
    rules: { 'specs/capture-after-sees': 'error' },
  },
  {
    files: ['src/pages/**/*.robot.ts'],
    plugins: { specs },
    rules: { 'specs/full-page-capture': 'error' },
  },
  {
    files: ['src/**/*.espresso.spec.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...NO_COLOR_BLIND, {
        selector: "CallExpression[callee.property.name=/^(toHaveScreenshot|toHaveCSS|capture)$/], CallExpression[callee.name='getComputedStyle']",
        message: 'Espresso specs check behaviour. Put look checks in the screenshot spec through the robot’s capture().',
      }],
    },
  },
  {
    // Vitest tests use Fake* doubles from src/testing, which record what happened like the real thing would.
    files: ['src/**/*.test.{ts,tsx}', 'src/**/*Test.{ts,tsx}'],
    rules: {
      'no-restricted-properties': ['error',
        ...['fn', 'mock', 'spyOn', 'doMock'].map((property) => ({
          object: 'vi',
          property,
          message: 'Use a Fake* double from src/testing instead of a mock, so the test exercises real behaviour.',
        })),
      ],
    },
  },
  {
    // A page's Vitest tests are view-model tests. Rendering and clicking belong in espresso specs.
    files: ['src/pages/**/*.test.{ts,tsx}', 'src/pages/**/*Test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', {
        paths: [{
          name: '@testing-library/react',
          importNames: ['render', 'screen', 'fireEvent', 'within'],
          message: 'Test the view model with renderHook. Rendering and clicking a page belongs in its espresso spec.',
        }],
      }],
      'no-restricted-globals': ['error',
        { name: 'localStorage', message: 'Persistence is behaviour: check it in an espresso spec, or through a storage Fake.' },
        { name: 'sessionStorage', message: 'Persistence is behaviour: check it in an espresso spec, or through a storage Fake.' },
      ],
    },
  },
])
