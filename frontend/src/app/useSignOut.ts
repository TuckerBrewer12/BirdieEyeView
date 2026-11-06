import { useMutation } from "@tanstack/react-query";

/** The one session call the shell makes. `useAuth()` satisfies it. */
export interface SignOutActions {
  logout(): Promise<void>;
}

/**
 * Signs out. The session clears even when the call fails, so the signed-out
 * screens take over either way; the mutation only holds the pending state.
 */
export function useSignOut(auth: SignOutActions) {
  return useMutation({ mutationFn: () => auth.logout() });
}
