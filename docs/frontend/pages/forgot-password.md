# Forgot password

Route: `/forgot-password`. Access: Signed out.

Requests a password-reset email without exposing whether an address belongs to an account.

## Entry points

- [ForgotPasswordPage.tsx](../../../frontend/src/pages/ForgotPasswordPage.tsx)
- [AuthContext.tsx](../../../frontend/src/context/AuthContext.tsx)

## How it works

The form sends an email address through useAuth().forgotPassword() and displays the API message or a safe transport error. Token generation and email delivery belong to the backend.

## Boundaries and checks when changing it

Keep account-enumeration protections in the copy and status handling. Check empty/invalid input, pending submission, transport failure, and the generic success state. A successful request is not confirmation that an email arrived.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
