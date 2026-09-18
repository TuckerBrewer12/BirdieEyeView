import type { LoginAuth } from "../../pages/landing-page/login/useLoginPageViewModel";

/** Stands in for `useAuth()` on the login view model. Records calls; fails on request. */
export class FakeLoginAuth implements LoginAuth {
  readonly logins: { email: string; password: string }[] = [];
  readonly resends: string[] = [];
  loginError: Error | null = null;
  resendMessage = "If this account exists, a verification email has been sent.";

  login = async (email: string, password: string): Promise<void> => {
    this.logins.push({ email, password });
    if (this.loginError) throw this.loginError;
  };

  resendVerification = async (email: string): Promise<string> => {
    this.resends.push(email);
    return this.resendMessage;
  };
}
