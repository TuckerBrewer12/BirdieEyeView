import { useMutation } from "@tanstack/react-query";
import type { AuthActions } from "./authActions";

/** Asks for a password reset link. The server answers the same whether or not the account exists. */
export function useRequestReset(auth: Pick<AuthActions, "forgotPassword">) {
  return useMutation({ mutationFn: (email: string) => auth.forgotPassword(email) });
}
