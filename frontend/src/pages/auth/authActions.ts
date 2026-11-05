/** Who the session says is signed in, as far as the signed-out screens care. */
export interface SessionCheck {
  userId: string | null;
  emailVerified: boolean;
}

/** What a new account is created with. */
export interface Registration {
  name: string;
  email: string;
  password: string;
  /** A handicap index, plus handicaps negative. Null when none was given. */
  handicap: number | null;
  homeCourseId: string | null;
}

/**
 * The account calls the signed-out screens make. `useAuth()` satisfies it, since signing in also
 * has to update the session the rest of the app reads; tests pass a FakeAuth. Each call resolves
 * with the server's message to show, and rejects with an Error whose message is fit to show.
 */
export interface AuthActions {
  login(email: string, password: string): Promise<void>;
  register(
    name: string,
    email: string,
    password: string,
    options?: { handicap?: number | null; home_course_id?: string | null },
  ): Promise<string>;
  resendVerification(email: string): Promise<string>;
  verifyEmail(token: string): Promise<string>;
  forgotPassword(email: string): Promise<string>;
  resetPassword(token: string, newPassword: string): Promise<string>;
  refreshSession(): Promise<SessionCheck | null>;
}
