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
  fieldErrors: NewPasswordErrors;

  notice: string | null;
  tokenMissing: boolean;
  error: string | null;
  canSubmit: boolean;
  submitting: boolean;
  submit: () => void;
  done: boolean;
}

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
    tokenMissing: !trimmedToken,
    error: reset.error ? messageFrom(reset.error, "Could not reset password.") : null,
    canSubmit: !!trimmedToken && !reset.isPending && !reset.isSuccess,
    submitting: reset.isPending,
    submit,
    done: reset.isSuccess,
  };
}
