# Settings

Route: `/settings`. Access: Signed in.

Edits player preferences/profile context and controls theme and accessibility preferences.

## Entry points

- [SettingsPage.tsx](../../../frontend/src/pages/SettingsPage.tsx)
- [handicap.ts](../../../frontend/src/lib/handicap.ts)
- [theme.ts](../../../frontend/src/lib/theme.ts)
- [accessibility.ts](../../../frontend/src/lib/accessibility.ts)

## How it works

The page loads the user and course options, maintains editable drafts, saves supported profile fields, and refreshes displayed user data. Theme and color-blind preferences use shared browser helpers. Unsaved-change handling protects the local form.

## Boundaries and checks when changing it

Keep user-entered plus handicaps, unset values, and course selection semantics explicit. Check save failures, discard/navigation behavior, and theme/accessibility propagation. New model fields are not automatically available through the current profile API or UI.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
