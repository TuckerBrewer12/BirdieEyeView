import { useMutation } from "@tanstack/react-query";
import type { AuthActions, Registration } from "./authActions";

export function useRegister(auth: Pick<AuthActions, "register">) {
  return useMutation({
    mutationFn: ({ name, email, password, handicap, homeCourseId }: Registration) =>
      auth.register(name, email, password, { handicap, home_course_id: homeCourseId }),
  });
}
