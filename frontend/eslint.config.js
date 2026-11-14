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

const NO_RAW_API_FETCH = [{
  selector: "CallExpression[callee.name='fetch'] > CallExpression.arguments[callee.name='apiUrl']",
  message: 'Call the API through src/lib/api.ts so the request and response use the generated types.',
}]

const IMPORT_META = [{
  selector: "MetaProperty[meta.name='import'][property.name='meta']",
  message: 'import.meta is Vite-only. Read config at the app edge and pass it in.',
}]

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
    selector: "JSXExpressionContainer CallExpression[callee.property.name='toPrecision'], JSXExpressionContainer CallExpression[callee.object.name='Math'][callee.property.name='round']",
    message: 'Number formatting in JSX gets copied between views. Use a formatter from domain/ or the page’s presenter.',
  },
]

const NO_VIEW_CLOCK = [{
  selector: "NewExpression[callee.name='Date'][arguments.length=0], CallExpression[callee.object.name='Date'][callee.property.name='now']",
  message: 'Reading the clock in a view hides state. Have the view model read it (and take a clock a test can pin) and hand over what it means.',
}]

const NO_RAW_CONTROLS = [{
  selector: 'JSXOpeningElement[name.name=/^(button|input|select|textarea)$/]',
  message: 'Use the kit’s control (Button, Input, InputGroup, ToggleGroup, PickerMenu from @/brand) instead of a raw element.',
}]

const NO_API_TYPES_IN_COMPONENTS = {
  group: ['@/types/api', '@/types/api.gen', '@/types/golf'],
  message: 'Components take the domain’s types (@/domain), not the API’s. Map the response in the repository or view model.',
}

const UI_FILES = [
  'src/brand/**/*.{ts,tsx}',
  'src/app/**/*.{ts,tsx}',
  'src/pages/**/*.{ts,tsx}',
]
const UI_IGNORES = [
  'src/brand/theme/**',
  '**/tests/**',
  '**/*.test.{ts,tsx}',
  '**/*Test.{ts,tsx}',
]

export default defineConfig([
  globalIgnores(['dist', 'playwright-report', 'test-results', 'playwright/.cache']),
  {
    linterOptions: {
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
      '@eslint-community/eslint-comments/require-description': 'error',
    },
  },
  {
    files: ['src/**/*.tsx'],
    extends: [jsxA11y.flatConfigs.recommended],
    settings: {
      'jsx-a11y': { components: { Checkbox: 'input' } },
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': ['error', { considerDefaultExhaustiveForUnions: true }],
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
      'no-restricted-syntax': ['error', ...THEME_IS_CSS, ...NO_RAW_API_FETCH],
    },
  },
  {
    files: [
      'src/domain/**/*.ts',
      'src/data/**/*.ts',
      'src/types/**/*.ts',
      'src/lib/api.ts',
      'src/lib/apiBase.ts',
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
      'no-restricted-syntax': ['error', ...IMPORT_META, ...THEME_IS_CSS, ...NO_RAW_API_FETCH],
    },
  },
  {
    files: UI_FILES,
    ignores: UI_IGNORES,
    plugins: { golf, kit },
    rules: Object.fromEntries([
      ...Object.keys(golf.rules).map((rule) => `golf/${rule}`),
      ...Object.keys(kit.rules).filter((rule) => rule !== 'no-format-outside-domain').map((rule) => `kit/${rule}`),
    ].map((rule) => [rule, 'error'])),
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: UI_IGNORES,
    plugins: { kit },
    rules: { 'kit/no-format-outside-domain': 'error' },
  },
  {
    files: UI_FILES.map((glob) => glob.replace('{ts,tsx}', 'tsx')),
    ignores: [...UI_IGNORES, 'src/brand/components/**'],
    rules: {
      'no-restricted-syntax': ['error', ...THEME_IS_CSS, ...NO_RAW_API_FETCH, ...VIEW_SHAPING, ...NO_VIEW_CLOCK, ...NO_RAW_CONTROLS],
    },
  },
  {
    files: ['src/brand/components/**/*.tsx'],
    ignores: UI_IGNORES,
    rules: {
      'no-restricted-syntax': ['error', ...THEME_IS_CSS, ...NO_RAW_API_FETCH, ...VIEW_SHAPING, ...NO_VIEW_CLOCK],
    },
  },
  {
    files: ['src/brand/**/*.{ts,tsx}', 'src/pages/**/components/**/*.{ts,tsx}'],
    ignores: UI_IGNORES,
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', { patterns: [NO_API_TYPES_IN_COMPONENTS] }],
    },
  },
  {
    files: ['src/**/*.spec.ts', 'src/**/*.robot.ts'],
    extends: [playwright.configs['flat/recommended']],
    plugins: { specs },
    rules: {
      'playwright/expect-expect': ['error', { assertFunctionPatterns: ['^sees', '^doesNotSee', '^isAt', '^goesTo', '^asked', '^capture', '^expect'] }],
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
      'no-restricted-syntax': ['error', {
        selector: "CallExpression[callee.property.name=/^(toHaveScreenshot|toHaveCSS|capture)$/], CallExpression[callee.name='getComputedStyle']",
        message: 'Espresso specs check behaviour. Put look checks in the screenshot spec through the robot’s capture().',
      }],
    },
  },
  {
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
