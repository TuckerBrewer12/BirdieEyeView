import { useCallback, useState } from "react";
import { messageFrom } from "@/lib/userFacingErrors";
import type { AuthActions } from "../authActions";
import { hasErrors, newPasswordErrors, type NewPasswordErrors } from "../authModel";
import { useRegister } from "../useRegister";

export interface RegisterViewModel {
  name: string;
  setName: (name: string) => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  confirm: string;
  setConfirm: (confirm: string) => void;

  /** Why the password or its confirmation can't be sent, from the last submit; editing a field clears its own. */
  fieldErrors: NewPasswordErrors;
  /** The server's refusal, such as an email already in use. */
  error: string | null;
  submitting: boolean;
  /** Checks the password, then creates the account; `onRegistered` gets the email and the server's message. */
  submit: (onRegistered: (email: string, message: string) => void) => void;
}

const NO_ERRORS: NewPasswordErrors = { password: null, confirm: null };

/**
 * Create account: a name, an email, and a password typed twice. The handicap and home course are
 * set later in Settings.
 */
export function useRegisterViewModel(auth: Pick<AuthActions, "register">): RegisterViewModel {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<NewPasswordErrors>(NO_ERRORS);
  const register = useRegister(auth);
  const { mutate: createAccount } = register;

  const submit = useCallback(
    (onRegistered: (email: string, message: string) => void) => {
      const errors = newPasswordErrors(password, confirm);
      setFieldErrors(errors);
      if (hasErrors(errors)) return;

      const address = email.trim();
      createAccount(
        { name: name.trim(), email: address, password },
        { onSuccess: (message) => onRegistered(address, message) },
      );
    },
    [name, email, password, confirm, createAccount],
  );

  return {
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword: (next) => {
      setPassword(next);
      setFieldErrors((errors) => (errors.password ? { ...errors, password: null } : errors));
    },
    confirm,
    setConfirm: (next) => {
      setConfirm(next);
      setFieldErrors((errors) => (errors.confirm ? { ...errors, confirm: null } : errors));
    },
    fieldErrors,
    error: register.error ? messageFrom(register.error, "Registration failed") : null,
    submitting: register.isPending,
    submit,
  };
}
