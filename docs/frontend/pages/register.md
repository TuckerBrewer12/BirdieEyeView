# Create account

Route: `/register`. Access: Public.

Part of signing in and account recovery, on `AuthCard`.

## Entry points

- [RegisterPage.tsx](../../../frontend/src/pages/auth/register/RegisterPage.tsx)
- [useRegisterViewModel.ts](../../../frontend/src/pages/auth/register/useRegisterViewModel.ts)
- [AuthContext.tsx](../../../frontend/src/context/AuthContext.tsx)

## How it works

Name, email, password and confirm password, checked as typed. The handicap and home course are set later in Settings. Requests go through `AuthContext`'s actions.

## Boundaries and checks when changing it

Don't reveal whether an account exists. Check a refused request, an expired token and a slow network.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
