import { useCallback, useMemo, useState } from "react";
import { messageFrom } from "@/lib/userFacingErrors";
import {
  awaitsAnswer,
  requestsIn,
  type Friendship,
  type FriendshipAnswer,
  type FriendshipDirection,
} from "../friendsModel";
import { friendsRepository, type FriendsRepository } from "../friendsRepository";
import { useFriendships } from "../useFriendships";
import { useRespondToRequest } from "../useRespondToRequest";

export type InboxTab = FriendshipDirection;

export interface FriendsInboxPageViewModel {
  loading: boolean;
  loadError: string | null;
  tab: InboxTab;
  setTab: (tab: InboxTab) => void;
  receivedCount: number;
  sentCount: number;
  /** The open tab's requests. */
  requests: Friendship[];
  /** Empty copy — false while loading or when a load error is showing. */
  showEmpty: boolean;

  canRespond: (friendship: Friendship) => boolean;
  /** Whether this request's answer is on its way to the server. */
  isResponding: (friendshipId: string) => boolean;
  respond: (friendshipId: string, answer: FriendshipAnswer) => void;
  /** How the last request was answered; cleared on the next answer or tab change. */
  answered: FriendshipAnswer | null;
  respondError: string | null;
}

export function useFriendsInboxPageViewModel(
  userId: string,
  repository: FriendsRepository = friendsRepository,
): FriendsInboxPageViewModel {
  const { data = [], isLoading: loading, isError, error } = useFriendships(userId, repository);
  const {
    mutate: answer,
    isPending,
    variables,
    error: respondFailure,
    reset: resetRespond,
  } = useRespondToRequest(userId, repository);

  const [tab, setTabState] = useState<InboxTab>("received");
  const [answered, setAnswered] = useState<FriendshipAnswer | null>(null);

  const received = useMemo(() => requestsIn(data, "received"), [data]);
  const sent = useMemo(() => requestsIn(data, "sent"), [data]);
  const requests = tab === "received" ? received : sent;
  const loadError = isError ? messageFrom(error, "Could not load your inbox.") : null;

  const setTab = useCallback(
    (next: InboxTab) => {
      setTabState(next);
      setAnswered(null);
      resetRespond();
    },
    [resetRespond],
  );

  const respond = useCallback(
    (friendshipId: string, reply: FriendshipAnswer) => {
      setAnswered(null);
      answer({ friendshipId, answer: reply }, { onSuccess: () => setAnswered(reply) });
    },
    [answer],
  );

  const isResponding = useCallback(
    (friendshipId: string) => isPending && variables?.friendshipId === friendshipId,
    [isPending, variables],
  );

  return {
    loading,
    loadError,
    tab,
    setTab,
    receivedCount: received.length,
    sentCount: sent.length,
    requests,
    showEmpty: !loading && loadError == null && requests.length === 0,
    canRespond: awaitsAnswer,
    isResponding,
    respond,
    answered,
    respondError: respondFailure
      ? messageFrom(respondFailure, "Could not answer that request.")
      : null,
  };
}
