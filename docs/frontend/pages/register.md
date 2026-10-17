# Registration

Route: `/register`. Access: Signed out.

Creates an account with profile inputs and begins email verification.

## Entry points

- [RegisterPage.tsx](../../../frontend/src/pages/RegisterPage.tsx)
- [AuthContext.tsx](../../../frontend/src/context/AuthContext.tsx)

## How it works

The page validates form inputs for feedback, then calls the auth provider registration action. The backend remains authoritative for validation and course-reference access. Successful registration leads into the verification workflow rather than assuming the account can already perform every authenticated action.

## Boundaries and checks when changing it

Keep password rules consistent with backend limits and preserve safe public error wording. Check mismatched passwords, duplicate/network failures, optional handicap/course inputs, and navigation to verification pending.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
