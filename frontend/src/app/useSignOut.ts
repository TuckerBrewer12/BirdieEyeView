import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";

export interface SignOutActions {
  logout(): Promise<void>;
}

export function useSignOut(auth: SignOutActions) {
  const mutation = useMutation({ mutationFn: () => auth.logout() });
  const { mutate, isPending } = mutation;
  const signOut = useCallback(() => {
    if (!isPending) mutate();
  }, [isPending, mutate]);
  return { ...mutation, signOut };
}
