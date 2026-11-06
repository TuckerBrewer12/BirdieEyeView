import type { AuthActions, SessionCheck } from "../../pages/auth/authActions";

/** The messages the real `api/routers/auth.py` answers with. */
export const AUTH_MESSAGES = {
  registered: "Account created. Check your email to verify your account before signing in.",
  verificationSent: "If this account exists, a verification email has been sent.",
  verified: "Email verified. You can now sign in.",
  resetSent: "If this account exists, a password reset link has been sent.",
  passwordReset: "Password has been reset. You can now sign in.",
  badCredentials: "Invalid email or password",
  unverified: "Email not verified. Please verify your email before signing in.",
  emailTaken: "An account with this email already exists",
  badVerifyToken: "Invalid or expired verification token",
  badResetToken: "Invalid or expired reset token",
} as const;

type Call = keyof Omit<AuthActions, "refreshSession">;

/**
 * Stands in for `useAuth()` in view model tests. Records what each call was sent, answers with
 * the server's messages, and fails a call on request. `hold` makes a call wait for `release()`,
 * so a test can see it in flight.
 */
export class FakeAuth implements AuthActions {
  readonly logins: { email: string; password: string }[] = [];
  readonly registrations: {
    name: string;
    email: string;
    password: string;
    handicap: number | null | undefined;
    homeCourseId: string | null | undefined;
  }[] = [];
  readonly resends: string[] = [];
  readonly verifiedTokens: string[] = [];
  readonly resetRequests: string[] = [];
  readonly resets: { token: string; password: string }[] = [];
  sessionChecks = 0;

  /** A call's failure, as the user-facing message the server would send. */
  readonly errors: Partial<Record<Call, string>> = {};
  /** What `refreshSession` reports. Signed out until a test says otherwise. */
  session: SessionCheck | null = null;
  private held = new Set<Call>();
  private waiting: (() => void)[] = [];

  hold(call: Call): this {
    this.held.add(call);
    return this;
  }

  release(): void {
    this.held.clear();
    for (const resume of this.waiting.splice(0)) resume();
  }

  fail(call: Call, message: string): this {
    this.errors[call] = message;
    return this;
  }

  private async answer<T>(call: Call, value: T): Promise<T> {
    if (this.held.has(call)) {
      await new Promise<void>((resume) => this.waiting.push(resume));
    }
    const error = this.errors[call];
    if (error) throw new Error(error);
    return value;
  }

  login = async (email: string, password: string): Promise<void> => {
    this.logins.push({ email, password });
    return this.answer("login", undefined);
  };

  register = async (
    name: string,
    email: string,
    password: string,
    options?: { handicap?: number | null; home_course_id?: string | null },
  ): Promise<string> => {
    this.registrations.push({
      name,
      email,
      password,
      handicap: options?.handicap,
      homeCourseId: options?.home_course_id,
    });
    return this.answer("register", AUTH_MESSAGES.registered);
  };

  resendVerification = async (email: string): Promise<string> => {
    this.resends.push(email);
    return this.answer("resendVerification", AUTH_MESSAGES.verificationSent);
  };

  verifyEmail = async (token: string): Promise<string> => {
    this.verifiedTokens.push(token);
    return this.answer("verifyEmail", AUTH_MESSAGES.verified);
  };

  forgotPassword = async (email: string): Promise<string> => {
    this.resetRequests.push(email);
    return this.answer("forgotPassword", AUTH_MESSAGES.resetSent);
  };

  resetPassword = async (token: string, newPassword: string): Promise<string> => {
    this.resets.push({ token, password: newPassword });
    return this.answer("resetPassword", AUTH_MESSAGES.passwordReset);
  };

  refreshSession = async (): Promise<SessionCheck | null> => {
    this.sessionChecks += 1;
    return this.session;
  };
}
