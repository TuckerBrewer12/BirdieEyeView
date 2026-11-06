# Email verification

Route: `/verify-email`. Access: Public; also reachable while signed in.

Consumes an emailed verification token and displays the resulting account-verification status.

## Entry points

- [VerifyEmailPage.tsx](../../../frontend/src/pages/VerifyEmailPage.tsx)
- [AuthContext.tsx](../../../frontend/src/context/AuthContext.tsx)

## How it works

The page reads the token query parameter and starts verification in an effect. It tracks the request by token and guards updates after cleanup. App explicitly permits this route while signed in as well as signed out.

## Boundaries and checks when changing it

Preserve protection against repeated effect execution for the same token. Check missing, invalid, expired, and successful tokens, token changes, and session refresh behavior. Do not log or commit real email-link tokens.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
