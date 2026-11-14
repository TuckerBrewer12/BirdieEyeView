import { useMutation } from "@tanstack/react-query";
import type { AuthActions } from "./authActions";

export function useRequestReset(auth: Pick<AuthActions, "forgotPassword">) {
  return useMutation({ mutationFn: (email: string) => auth.forgotPassword(email) });
}
