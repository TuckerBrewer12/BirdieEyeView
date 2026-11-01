import { useCallback, useState } from "react";
import { messageFrom } from "@/lib/userFacingErrors";
import type { AuthActions } from "../authActions";
import { isUnverifiedSignIn } from "../authModel";
import { useLogin } from "../useLogin";
import { useResendVerification } from "../useResendVerification";

/** What the screen that sent the golfer here handed over. */
export interface LoginArrival {
  email?: string | null;
  /** Register, reset password and verify pending leave a line to show, such as "Password reset". */
  flash?: string | null;
}

export interface LoginViewModel {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;

  /** What went through: the arriving screen's line, or a resent link. */
  notice: string | null;
  error: string | null;

  submitting: boolean;
  submitLabel: string;
  /** Signs in; `onSignedIn` runs only if it worked. */
  submit: (onSignedIn: () => void) => void;

  /** Only an unverified account's refusal offers a fresh link. */
  canResendVerification: boolean;
  resending: boolean;
  resendLabel: string;
  resendVerification: () => void;
}

export function useLoginViewModel(
  auth: Pick<AuthActions, "login" | "resendVerification">,
  arrival: LoginArrival = {},
): LoginViewModel {
  const [email, setEmail] = useState(() => (arrival.email ?? "").trim());
  const [password, setPassword] = useState("");
  const [missingEmail, setMissingEmail] = useState(false);
  const login = useLogin(auth);
  const resend = useResendVerification(auth);

  const { mutate: signIn } = login;
  const { mutate: sendLink, reset: resetResend } = resend;

  const submit = useCallback(
    (onSignedIn: () => void) => {
      setMissingEmail(false);
      resetResend();
      signIn({ email: email.trim(), password }, { onSuccess: onSignedIn });
    },
    [email, password, signIn, resetResend],
  );

  const resendVerification = useCallback(() => {
    const address = email.trim();
    if (!address) {
      setMissingEmail(true);
      return;
    }
    setMissingEmail(false);
    sendLink(address);
  }, [email, sendLink]);

  const loginError = login.error ? messageFrom(login.error, "Login failed") : null;
  const resendError = resend.error
    ? messageFrom(resend.error, "Could not resend verification email.")
    : null;

  return {
    email,
    setEmail: (next) => {
      setEmail(next);
      setMissingEmail(false);
    },
    password,
    setPassword,
    notice: resend.data ?? (login.isIdle ? (arrival.flash ?? null) : null),
    error: missingEmail
      ? "Enter your email first to resend verification."
      : (resendError ?? loginError),
    submitting: login.isPending,
    submitLabel: login.isPending ? "Signing in…" : "Sign in",
    submit,
    canResendVerification: isUnverifiedSignIn(loginError),
    resending: resend.isPending,
    resendLabel: resend.isPending ? "Sending…" : "Resend verification email",
    resendVerification,
  };
}
