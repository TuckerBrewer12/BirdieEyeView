# Verification pending

Route: `/verify-pending`. Access: Public account flow.

Explains that account verification is pending and provides supported resend/session-refresh actions.

## Entry points

- [VerifyPendingPage.tsx](../../../frontend/src/pages/VerifyPendingPage.tsx)
- [AuthContext.tsx](../../../frontend/src/context/AuthContext.tsx)

## How it works

The page obtains account/email context from its route/session inputs and calls AuthContext for verification-related actions. Local state provides pending/success/error feedback while the server decides resend and verification behavior.

## Boundaries and checks when changing it

Preserve generic public messages where required by the API contract. Check direct navigation with missing context, resend failures and duplicate clicks, and transition after verification. A resend success message does not prove email delivery.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
