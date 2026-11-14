import { useMutation } from "@tanstack/react-query";
import type { AuthActions } from "./authActions";

export function useResendVerification(auth: Pick<AuthActions, "resendVerification">) {
  return useMutation({ mutationFn: (email: string) => auth.resendVerification(email) });
}
