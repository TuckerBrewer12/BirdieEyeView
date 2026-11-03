import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import type { AuthActions } from "./authActions";

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
