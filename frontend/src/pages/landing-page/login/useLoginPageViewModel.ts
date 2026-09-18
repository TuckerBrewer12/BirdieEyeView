import { useCallback, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/** The two auth calls sign-in needs. `useAuth()` satisfies it; tests pass a fake. */
export interface LoginAuth {
  login: (email: string, password: string) => Promise<void>;
  resendVerification: (email: string) => Promise<string>;
}

/** What other pages hand over when they send someone here. */
interface LoginRouteState {
  email?: string;
  flash?: string;
}

export interface LoginPageViewModel {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  passwordRevealed: boolean;
  passwordInputType: "text" | "password";
  revealLabel: string;
  togglePasswordRevealed: () => void;

  /** Set by Register, ResetPassword and VerifyPending on the way here. */
  flashMessage: string | null;
  error: string | null;
  resendMessage: string | null;

  submitting: boolean;
  submitLabel: string;
  submit: (event: FormEvent) => void;

  canResendVerification: boolean;
  resending: boolean;
  resendLabel: string;
  resendVerification: () => void;
}

const UNVERIFIED = "email not verified";

export function useLoginPageViewModel(auth: LoginAuth): LoginPageViewModel {
  const navigate = useNavigate();
  const routeState = (useLocation().state ?? null) as LoginRouteState | null;

  const [email, setEmail] = useState(() => (routeState?.email ?? "").trim());
  const [password, setPassword] = useState("");
  const [passwordRevealed, setPasswordRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const togglePasswordRevealed = useCallback(() => setPasswordRevealed((shown) => !shown), []);

  const submit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      setError(null);
      setSubmitting(true);
      auth
        .login(email, password)
        .then(() => navigate("/"))
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Login failed");
          setResendMessage(null);
        })
        .finally(() => setSubmitting(false));
    },
    [auth, email, password, navigate],
  );

  const resendVerification = useCallback(() => {
    const address = email.trim();
    if (!address) {
      setError("Enter your email first to resend verification.");
      return;
    }
    setResending(true);
    setResendMessage(null);
    auth
      .resendVerification(address)
      .then(setResendMessage)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not resend verification email.");
      })
      .finally(() => setResending(false));
  }, [auth, email]);

  return {
    email,
    setEmail,
    password,
    setPassword,
    passwordRevealed,
    passwordInputType: passwordRevealed ? "text" : "password",
    revealLabel: passwordRevealed ? "Hide password" : "Show password",
    togglePasswordRevealed,
    flashMessage: routeState?.flash ?? null,
    error,
    resendMessage,
    submitting,
    submitLabel: submitting ? "Signing in…" : "Sign In",
    submit,
    // The API answers an unverified sign-in with a 403 whose detail says so;
    // that detail is the only signal the page gets.
    canResendVerification: error?.toLowerCase().includes(UNVERIFIED) ?? false,
    resending,
    resendLabel: resending ? "Sending…" : "Resend Verification Email",
    resendVerification,
  };
}
