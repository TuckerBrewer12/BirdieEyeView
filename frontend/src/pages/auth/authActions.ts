export interface SessionCheck {
  userId: string | null;
  emailVerified: boolean;
}

export interface Registration {
  name: string;
  email: string;
  password: string;
  handicap: number | null;
  homeCourseId: string | null;
}

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
