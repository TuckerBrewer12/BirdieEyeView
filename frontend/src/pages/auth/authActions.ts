export interface SessionCheck {
  userId: string | null;
  emailVerified: boolean;
}

export interface Registration {
  name: string;
  email: string;
  password: string;
}

export interface AuthActions {
  login(email: string, password: string): Promise<void>;
  register(name: string, email: string, password: string): Promise<string>;
  resendVerification(email: string): Promise<string>;
  verifyEmail(token: string): Promise<string>;
  forgotPassword(email: string): Promise<string>;
  resetPassword(token: string, newPassword: string): Promise<string>;
  refreshSession(): Promise<SessionCheck | null>;
}
