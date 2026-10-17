# Login

Route: `/login`. Access: Signed out.

Authenticates an existing account and hands session state back to the shared auth provider.

## Entry points

- [LoginPage.tsx](../../../frontend/src/pages/LoginPage.tsx)
- [AuthContext.tsx](../../../frontend/src/context/AuthContext.tsx)
- [sessionToken.ts](../../../frontend/src/lib/sessionToken.ts)

## How it works

The page owns form/loading/error presentation and calls useAuth().login(). AuthContext handles the request and updates shared session state; App then selects signed-in routes. Account transport is separate from ordinary golf-data API helpers.

## Boundaries and checks when changing it

Keep credentials out of URLs, logs, fixtures, and persistent draft state. Check invalid credentials, network failure, pending submissions, and verification-related feedback using the server response contract.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
