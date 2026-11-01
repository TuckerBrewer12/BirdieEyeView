import { useCallback, useState } from "react";
import { messageFrom } from "@/lib/userFacingErrors";
import type { AuthActions } from "../authActions";
import { useRequestReset } from "../useRequestReset";

export interface ForgotPasswordViewModel {
  email: string;
  setEmail: (email: string) => void;
  /** The server's word that a link is on its way. */
  notice: string | null;
  error: string | null;
  submitting: boolean;
  submitLabel: string;
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
    submitLabel: request.isPending ? "Sending link…" : "Send reset link",
    submit,
  };
}
