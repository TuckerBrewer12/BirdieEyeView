import { useCallback, useMemo, useState } from "react";
import { messageFrom } from "@/lib/userFacingErrors";
import { acceptedFriends, awaitsAnswer, type Friendship } from "@/data/friendsModel";
import { friendsRepository, type FriendsRepository } from "@/data/friendsRepository";
import { useFriendships } from "@/data/useFriendships";
import { useUser } from "@/data/useUser";
import { userRepository, type UserRepository } from "@/data/userRepository";
import { useSendFriendRequest } from "./useSendFriendRequest";

/** What Social reads: the golfer's friendships, and their own profile for their friend code. */
export type SocialRepository = FriendsRepository & Pick<UserRepository, "getUser">;

const socialRepository: SocialRepository = { ...friendsRepository, getUser: userRepository.getUser };

export interface SocialPageViewModel {
  loading: boolean;
  loadError: string | null;
  /** Empty copy — false while loading or when a load error is showing. */
  showEmpty: boolean;
  friends: Friendship[];
  /** Requests sent to the golfer still waiting for an answer: the Requests button's count. */
  openRequests: number;

  /** The golfer's own friend code, to give to friends; null until the server has one. */
  myCode: string | null;

  friendCode: string;
  setFriendCode: (code: string) => void;
  sending: boolean;
  /** Send was pressed with nothing typed. */
  codeMissing: boolean;
  sendError: string | null;
  /** The last request went through; cleared once the golfer types again. */
  sent: boolean;
  sendRequest: () => void;
}

export function useSocialPageViewModel(
  userId: string,
  repository: SocialRepository = socialRepository,
): SocialPageViewModel {
  const { data = [], isLoading: loading, isError, error } = useFriendships(userId, repository);
  const { data: user } = useUser(userId, repository);
  const myCode = user?.friend_code || null;
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

  // Friend codes are upper case, so the field shows them that way as they are typed.
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
    openRequests: data.filter(awaitsAnswer).length,
    myCode,
    friendCode,
    setFriendCode,
    sending,
    codeMissing,
    sendError: sendFailure ? messageFrom(sendFailure, "Could not send that request.") : null,
    sent,
    sendRequest,
  };
}
