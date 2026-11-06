# Reset password

Route: `/reset-password`. Access: Signed out.

Accepts a reset token from an email link and submits a new password.

## Entry points

- [ResetPasswordPage.tsx](../../../frontend/src/pages/ResetPasswordPage.tsx)
- [AuthContext.tsx](../../../frontend/src/context/AuthContext.tsx)

## How it works

The page reads the token, collects and confirms the new password, performs basic form validation, and calls the auth provider reset action. It presents the returned result and a route back to sign-in; the backend validates and consumes the token.

## Boundaries and checks when changing it

Check missing/expired/used tokens, password mismatch, backend length limits, and failed requests. Client validation does not replace server validation or establish session revocation policy.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
