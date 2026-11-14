# Settings

Route: `/settings`. Access: Signed in.

The handicap, home course and friend code, theme and email updates, and sign out.

## Entry points

- [SettingsPage.tsx](../../../frontend/src/pages/settings/SettingsPage.tsx)
- [useSettingsPageViewModel.ts](../../../frontend/src/pages/settings/useSettingsPageViewModel.ts)
- [useLeaveGuard.ts](../../../frontend/src/pages/settings/useLeaveGuard.ts)
- [settingsRepository.ts](../../../frontend/src/pages/settings/settingsRepository.ts)

## How it works

Edits gather in the page until saved; a bar pinned at the foot (`ActionBar pinned="always"`) offers Discard and Save, and leaving with unsaved changes asks first (`useLeaveGuard`).

## Boundaries and checks when changing it

Check leaving with unsaved changes, a failed save, and an out-of-range handicap.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
