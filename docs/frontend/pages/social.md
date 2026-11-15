# Social and Requests

Route: `/social` and `/inbox`. Access: Signed in.

Friends with their handicap and last round, adding a friend by code, and the requests sent and received.

## Entry points

- [SocialPage.tsx](../../../frontend/src/pages/social/SocialPage.tsx)
- [useSocialPageViewModel.ts](../../../frontend/src/pages/social/useSocialPageViewModel.ts)
- [FriendsInboxPage.tsx](../../../frontend/src/pages/social/inbox/FriendsInboxPage.tsx)
- [useFriendsInboxPageViewModel.ts](../../../frontend/src/pages/social/inbox/useFriendsInboxPageViewModel.ts)
- [useFriendships.ts](../../../frontend/src/data/useFriendships.ts)

## How it works

`GET /api/users/me/friends` lists friendships; accepted ones carry `friend_handicap_index` and `friend_last_played`. Compare opens Analytics' Profile against the friend. The More menu's request count reads only pending requests (`useOpenRequestCount`).

## Boundaries and checks when changing it

Answering or sending a request updates the cached lists, so counts move at once. Check a bad code, a request already sent, and declining.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
