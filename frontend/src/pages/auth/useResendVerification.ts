import { useMutation } from "@tanstack/react-query";
import type { AuthActions } from "./authActions";

/** Mails another verification link. The server answers the same whether or not the account exists. */
export function useResendVerification(auth: Pick<AuthActions, "resendVerification">) {
  return useMutation({ mutationFn: (email: string) => auth.resendVerification(email) });
}
