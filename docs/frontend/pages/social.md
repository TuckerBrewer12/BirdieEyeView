# Social

Route: `/social`. Access: Signed in.

Lists accepted friendships and allows a player to send a friend request using a friend code.

## Entry points

- [SocialPage.tsx](../../../frontend/src/pages/SocialPage.tsx)
- [AuthContext.tsx](../../../frontend/src/context/AuthContext.tsx)

## How it works

The page gets account context, queries accepted friendships, and manages the request form and feedback locally. The backend owns friendship authorization and state transitions. Inbox navigation handles pending requests separately.

## Boundaries and checks when changing it

Check invalid/self/duplicate codes, loading/error/empty states, and refreshing the accepted list. This page currently has inline query/form logic; separate it only as part of the agreed frontend refactor.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
