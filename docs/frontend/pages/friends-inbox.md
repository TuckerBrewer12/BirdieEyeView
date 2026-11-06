# Friends inbox

Route: `/inbox`. Access: Signed in.

Shows received and sent friendship requests and supports the available request actions.

## Entry points

- [FriendsInboxPage.tsx](../../../frontend/src/pages/FriendsInboxPage.tsx)

## How it works

The page queries friendship records, selects received/sent tabs, and tracks the busy request and feedback. Status updates use API helpers and refresh query results. Friendship state is a server-owned relationship, not an optimistic local permission.

## Boundaries and checks when changing it

Check no requests, failed updates, repeated clicks, and the received/sent distinction. Keep status values aligned with backend transitions and avoid exposing profile data based only on a client-side relationship check.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
