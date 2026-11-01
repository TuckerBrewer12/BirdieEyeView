import { useMutation } from "@tanstack/react-query";
import type { AuthActions } from "./authActions";

export interface Credentials {
  email: string;
  password: string;
}

/** Signs in. On success the session holds the golfer, so the app's signed-in screens take over. */
export function useLogin(auth: Pick<AuthActions, "login">) {
  return useMutation({
    mutationFn: ({ email, password }: Credentials) => auth.login(email, password),
  });
}
