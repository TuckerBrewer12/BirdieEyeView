# Check your email

Route: `/verify-pending`. Access: Public.

Part of signing in and account recovery, on `AuthCard`.

## Entry points

- [VerifyPendingPage.tsx](../../../frontend/src/pages/auth/verify-pending/VerifyPendingPage.tsx)
- [useVerifyPendingViewModel.ts](../../../frontend/src/pages/auth/verify-pending/useVerifyPendingViewModel.ts)
- [AuthContext.tsx](../../../frontend/src/context/AuthContext.tsx)

## How it works

After sign-up: says where the link went and resends it. Requests go through `AuthContext`'s actions.

## Boundaries and checks when changing it

Don't reveal whether an account exists. Check a refused request, an expired token and a slow network.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
