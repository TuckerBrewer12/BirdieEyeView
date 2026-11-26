import { createContext, useContext } from "react";
import type { AuthActions } from "@/pages/auth/authActions";

export interface AuthState {
  userId: string | null;
  name: string | null;
  email: string | null;
  emailVerified: boolean;
}

export interface AuthContextValue extends AuthState, AuthActions {
  refreshSession(): Promise<AuthState | null>;
  logout(): Promise<void>;
  loading: boolean;
  signedOutByUser: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
