import { useCallback, useState } from "react";
import { messageFrom } from "@/lib/userFacingErrors";
import type { AuthActions } from "../authActions";
import { newPasswordError } from "../authModel";
import { useRegister } from "../useRegister";

export interface RegisterViewModel {
  name: string;
  setName: (name: string) => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;

  /** Why the password can't be sent, from the last submit; editing it clears this. */
  passwordError: string | null;
  /** The server's refusal, such as an email already in use. */
  error: string | null;
  submitting: boolean;
  /** Checks the password, then creates the account; `onRegistered` gets the email and the server's message. */
  submit: (onRegistered: (email: string, message: string) => void) => void;
}

/**
 * Create account: a name, an email and a password, as the frame has it. The handicap and home
 * course are set later in Settings.
 */
export function useRegisterViewModel(auth: Pick<AuthActions, "register">): RegisterViewModel {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const register = useRegister(auth);
  const { mutate: createAccount } = register;

  const submit = useCallback(
    (onRegistered: (email: string, message: string) => void) => {
      const problem = newPasswordError(password);
      setPasswordError(problem);
      if (problem) return;

      const address = email.trim();
      createAccount(
        { name: name.trim(), email: address, password },
        { onSuccess: (message) => onRegistered(address, message) },
      );
    },
    [name, email, password, createAccount],
  );

  return {
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword: (next) => {
      setPassword(next);
      setPasswordError(null);
    },
    passwordError,
    error: register.error ? messageFrom(register.error, "Registration failed") : null,
    submitting: register.isPending,
    submit,
  };
}
