# New password

Route: `/reset-password`. Access: Public.

Part of signing in and account recovery, on `AuthCard`.

## Entry points

- [ResetPasswordPage.tsx](../../../frontend/src/pages/auth/reset-password/ResetPasswordPage.tsx)
- [useResetPasswordViewModel.ts](../../../frontend/src/pages/auth/reset-password/useResetPasswordViewModel.ts)
- [AuthContext.tsx](../../../frontend/src/context/AuthContext.tsx)

## How it works

Sets a new password from the emailed link's token. Requests go through `AuthContext`'s actions.

## Boundaries and checks when changing it

Don't reveal whether an account exists. Check a refused request, an expired token and a slow network.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
