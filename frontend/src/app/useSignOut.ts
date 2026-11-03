import { useMutation } from "@tanstack/react-query";

export interface SignOutActions {
  logout(): Promise<void>;
}

export function useSignOut(auth: SignOutActions) {
  return useMutation({ mutationFn: () => auth.logout() });
}
