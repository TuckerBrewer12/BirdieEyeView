import { useMutation } from "@tanstack/react-query";
import type { AuthActions } from "./authActions";

export interface PasswordReset {
  token: string;
  password: string;
}

export function useResetPassword(auth: Pick<AuthActions, "resetPassword">) {
  return useMutation({
    mutationFn: ({ token, password }: PasswordReset) => auth.resetPassword(token, password),
  });
}
