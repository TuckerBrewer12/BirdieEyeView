import { createContext, useContext } from "react";

export interface AuthState {
  userId: string | null;
  name: string | null;
  email: string | null;
  emailVerified: boolean;
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<string>;
  resendVerification: (email: string) => Promise<string>;
  verifyEmail: (token: string) => Promise<string>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, newPassword: string) => Promise<string>;
  refreshSession: () => Promise<AuthState | null>;
  logout: () => Promise<void>;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
