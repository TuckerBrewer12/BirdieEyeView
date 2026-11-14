import { useCallback, useState } from "react";
import { messageFrom } from "@/lib/userFacingErrors";
import type { AuthActions } from "../authActions";
import { useRequestReset } from "../useRequestReset";

export interface ForgotPasswordViewModel {
  email: string;
  setEmail: (email: string) => void;
  notice: string | null;
  error: string | null;
  submitting: boolean;
  submit: () => void;
}

export function useForgotPasswordViewModel(
  auth: Pick<AuthActions, "forgotPassword">,
): ForgotPasswordViewModel {
  const [email, setEmail] = useState("");
  const request = useRequestReset(auth);
  const { mutate: requestReset } = request;

  const submit = useCallback(() => requestReset(email.trim()), [email, requestReset]);

  return {
    email,
    setEmail,
    notice: request.data ?? null,
    error: request.error ? messageFrom(request.error, "Could not send reset email.") : null,
    submitting: request.isPending,
    submit,
  };
}
