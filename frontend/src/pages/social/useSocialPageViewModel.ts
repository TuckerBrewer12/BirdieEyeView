import { useCallback, useMemo, useState } from "react";
import { messageFrom } from "@/lib/userFacingErrors";
import { acceptedFriends, type Friendship } from "@/data/friendsModel";
import { friendsRepository, type FriendsRepository } from "@/data/friendsRepository";
import { useFriendships } from "@/data/useFriendships";
import { useSendFriendRequest } from "./useSendFriendRequest";

export interface SocialPageViewModel {
  loading: boolean;
  loadError: string | null;
  showEmpty: boolean;
  friends: Friendship[];

  friendCode: string;
  setFriendCode: (code: string) => void;
  sending: boolean;
  codeMissing: boolean;
  sendError: string | null;
  sent: boolean;
  sendRequest: () => void;
}

export function useSocialPageViewModel(
  userId: string,
  repository: FriendsRepository = friendsRepository,
): SocialPageViewModel {
  const { data = [], isLoading: loading, isError, error } = useFriendships(userId, repository);
  const {
    mutate: send,
    isPending: sending,
    error: sendFailure,
    reset: resetSend,
  } = useSendFriendRequest(userId, repository);

  const [friendCode, setCode] = useState("");
  const [codeMissing, setCodeMissing] = useState(false);
  const [sent, setSent] = useState(false);

  const friends = useMemo(() => acceptedFriends(data), [data]);
  const loadError = isError ? messageFrom(error, "Could not load your friends.") : null;

  const setFriendCode = useCallback(
    (code: string) => {
      setCode(code.toUpperCase());
      setCodeMissing(false);
      setSent(false);
      resetSend();
    },
    [resetSend],
  );

  const sendRequest = useCallback(() => {
    const code = friendCode.trim();
    setSent(false);
    if (!code) {
      setCodeMissing(true);
      return;
    }
    send(code, {
      onSuccess: () => {
        setCode("");
        setSent(true);
      },
    });
  }, [friendCode, send]);

  return {
    loading,
    loadError,
    showEmpty: !loading && loadError == null && friends.length === 0,
    friends,
    friendCode,
    setFriendCode,
    sending,
    codeMissing,
    sendError: sendFailure ? messageFrom(sendFailure, "Could not send that request.") : null,
    sent,
    sendRequest,
  };
}
