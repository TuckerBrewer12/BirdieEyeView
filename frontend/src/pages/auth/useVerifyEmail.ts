import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import type { AuthActions } from "./authActions";

/**
 * Spends the emailed verification token as soon as the page opens. On success the server signs
 * the golfer in.
 *
 * A query rather than a mutation, though it posts: the token is single-use, and keying on it
 * means it is sent once however often the page mounts. React's development double-mount, and the
 * route swap when the new session lands, would otherwise send it again and report the second
 * try as an expired link.
 */
export function useVerifyEmail(auth: Pick<AuthActions, "verifyEmail">, token: string) {
  return useQuery({
    queryKey: queryKeys.emailVerification(token),
    queryFn: () => auth.verifyEmail(token),
    enabled: token.length > 0,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
