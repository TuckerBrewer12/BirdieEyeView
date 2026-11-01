import { useCallback, useState } from "react";
import { messageFrom } from "@/lib/userFacingErrors";
import type { AuthActions } from "../authActions";
import { hasErrors, newPasswordErrors, type NewPasswordErrors } from "../authModel";
import { useResetPassword } from "../useResetPassword";

const NO_ERRORS: NewPasswordErrors = { password: null, confirm: null };

export interface ResetPasswordViewModel {
  password: string;
  setPassword: (password: string) => void;
  confirm: string;
  setConfirm: (confirm: string) => void;
  /** Why a field can't be sent, from the last submit; editing a field clears its own. */
  fieldErrors: NewPasswordErrors;

  /** The server's confirmation once the password has changed. */
  notice: string | null;
  /** A link with no token, or the server's refusal (an expired link). */
  error: string | null;
  /** Without a token there is nothing to send, so the form stays shut. */
  canSubmit: boolean;
  submitting: boolean;
  submitLabel: string;
  submit: () => void;
  /** The password changed; the way on is signing in with it. */
  done: boolean;
}

/** `token` is the one-time token from the emailed link, blank when the link had none. */
export function useResetPasswordViewModel(
  auth: Pick<AuthActions, "resetPassword">,
  token: string,
): ResetPasswordViewModel {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<NewPasswordErrors>(NO_ERRORS);
  const reset = useResetPassword(auth);
  const { mutate: resetPassword } = reset;
  const trimmedToken = token.trim();

  const submit = useCallback(() => {
    if (!trimmedToken) return;
    const errors = newPasswordErrors(password, confirm);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;
    resetPassword({ token: trimmedToken, password });
  }, [trimmedToken, password, confirm, resetPassword]);

  const clearError = (field: keyof NewPasswordErrors) =>
    setFieldErrors((errors) => (errors[field] ? { ...errors, [field]: null } : errors));

  return {
    password,
    setPassword: (next) => {
      setPassword(next);
      clearError("password");
    },
    confirm,
    setConfirm: (next) => {
      setConfirm(next);
      clearError("confirm");
    },
    fieldErrors,
    notice: reset.data ?? null,
    error: !trimmedToken
      ? "Missing reset token. Open the reset link from your email."
      : reset.error
        ? messageFrom(reset.error, "Could not reset password.")
        : null,
    canSubmit: !!trimmedToken && !reset.isPending && !reset.isSuccess,
    submitting: reset.isPending,
    submitLabel: reset.isPending ? "Resetting…" : "Reset password",
    submit,
    done: reset.isSuccess,
  };
}
