import { useMutation } from "@tanstack/react-query";
import type { AuthActions } from "./authActions";

export interface PasswordReset {
  /** The one-time token from the emailed link. */
  token: string;
  password: string;
}

/** Sets a new password with the emailed token. Resolves with the server's confirmation. */
export function useResetPassword(auth: Pick<AuthActions, "resetPassword">) {
  return useMutation({
    mutationFn: ({ token, password }: PasswordReset) => auth.resetPassword(token, password),
  });
}
