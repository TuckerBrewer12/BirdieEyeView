# Reset password

Route: `/forgot-password`. Access: Public.

Part of signing in and account recovery, on `AuthCard`.

## Entry points

- [ForgotPasswordPage.tsx](../../../frontend/src/pages/auth/forgot-password/ForgotPasswordPage.tsx)
- [useForgotPasswordViewModel.ts](../../../frontend/src/pages/auth/forgot-password/useForgotPasswordViewModel.ts)
- [AuthContext.tsx](../../../frontend/src/context/AuthContext.tsx)

## How it works

Sends a reset link; the answer is the same whether or not the account exists. Requests go through `AuthContext`'s actions.

## Boundaries and checks when changing it

Don't reveal whether an account exists. Check a refused request, an expired token and a slow network.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
