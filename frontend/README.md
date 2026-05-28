# React + TypeScript + Vite

## Google Sign-In Setup

The website and native app both use the Google web OAuth client ID in `VITE_GOOGLE_CLIENT_ID`.

For the backend, configure `GOOGLE_OAUTH_CLIENT_ID` with the web client ID. If native iOS or Android ID tokens use platform-specific audiences, also configure `GOOGLE_IOS_CLIENT_ID` and `GOOGLE_ANDROID_CLIENT_ID`, or provide all allowed audiences in `GOOGLE_OAUTH_CLIENT_IDS`.

For iOS, replace the placeholders in `ios/App/App/Info.plist`:

- `REPLACE_WITH_GOOGLE_IOS_CLIENT_ID.apps.googleusercontent.com`
- `REPLACE_WITH_GOOGLE_IOS_REVERSED_CLIENT_ID`

For Android, create an Android OAuth client in Google Cloud using the app package name and signing certificate SHA fingerprints. The app package is `com.tuckerbrewer.golfscorecard`.

## Apple Sign-In Setup

The website Apple sign-in button uses `VITE_APPLE_CLIENT_ID`, which should be the Apple Services ID once the Apple Developer account is available. Set `VITE_APPLE_REDIRECT_URI` to a return URL configured on that Services ID.

For the backend, configure `APPLE_CLIENT_ID` with the same Services ID. If you later add native Apple sign-in too, use `APPLE_CLIENT_IDS` to allow both the Services ID and native Bundle ID audiences.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
