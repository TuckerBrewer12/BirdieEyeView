import { useMutation } from "@tanstack/react-query";
import type { AuthActions, Registration } from "./authActions";

/** Creates an account. Resolves with the server's word on what happens next (check your email). */
export function useRegister(auth: Pick<AuthActions, "register">) {
  return useMutation({
    mutationFn: ({ name, email, password }: Registration) => auth.register(name, email, password),
  });
}
