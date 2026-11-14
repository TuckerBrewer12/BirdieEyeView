# Verify email

Route: `/verify-email`. Access: Public.

Part of signing in and account recovery, on `AuthCard`.

## Entry points

- [VerifyEmailPage.tsx](../../../frontend/src/pages/auth/verify-email/VerifyEmailPage.tsx)
- [useVerifyEmailViewModel.ts](../../../frontend/src/pages/auth/verify-email/useVerifyEmailViewModel.ts)
- [AuthContext.tsx](../../../frontend/src/context/AuthContext.tsx)

## How it works

Confirms the emailed link's token and signs the golfer in. Requests go through `AuthContext`'s actions.

## Boundaries and checks when changing it

Don't reveal whether an account exists. Check a refused request, an expired token and a slow network.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
