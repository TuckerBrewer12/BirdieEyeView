# Sign in

Route: `/login`. Access: Public.

Part of signing in and account recovery, on `AuthCard`.

## Entry points

- [LoginPage.tsx](../../../frontend/src/pages/auth/login/LoginPage.tsx)
- [useLoginViewModel.ts](../../../frontend/src/pages/auth/login/useLoginViewModel.ts)
- [AuthContext.tsx](../../../frontend/src/context/AuthContext.tsx)

## How it works

Email and password, with "Forgot?" beside the password. A refused sign-in marks both fields until either changes and points them at the alert. Requests go through `AuthContext`'s actions.

## Boundaries and checks when changing it

Don't reveal whether an account exists. Check a refused request, an expired token and a slow network.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
