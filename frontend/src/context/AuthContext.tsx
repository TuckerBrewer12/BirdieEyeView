import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { apiUrl } from "@/lib/apiBase";
import { setSessionToken, withAuthHeaders } from "@/lib/sessionToken";
import {
  fetchWithUserFacingError,
  getUserFacingError,
  parseJsonResponse,
  USER_FACING_ERRORS,
} from "@/lib/userFacingErrors";
import type { AuthUserDto, MessageDto } from "@/types/api";
import { AuthContext, type AuthState } from "./auth";

const EMPTY_AUTH_STATE: AuthState = {
  userId: null,
  name: null,
  email: null,
  emailVerified: false,
};

function authStateFrom(user: AuthUserDto): AuthState {
  return {
    userId: user.user_id,
    name: user.name,
    email: user.email,
    emailVerified: !!user.email_verified,
  };
}

function sameAuthState(a: AuthState, b: AuthState): boolean {
  return (
    a.userId === b.userId &&
    a.name === b.name &&
    a.email === b.email &&
    a.emailVerified === b.emailVerified
  );
}

async function callAuth<T>(path: string, body: object): Promise<T> {
  const res = await fetchWithUserFacingError(apiUrl(`/api/auth${path}`), {
    method: "POST",
    credentials: "include",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  }, USER_FACING_ERRORS.account);
  if (!res.ok) {
    throw new Error(await getUserFacingError(res, USER_FACING_ERRORS.account));
  }
  return parseJsonResponse<T>(res, USER_FACING_ERRORS.account);
}

async function callAuthForMessage(path: string, body: object): Promise<string> {
  const data = await callAuth<MessageDto>(path, body);
  return data.message;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(EMPTY_AUTH_STATE);
  const latestStateRef = useRef<AuthState>(EMPTY_AUTH_STATE);
  const [loading, setLoading] = useState(true);
  const [signedOutByUser, setSignedOutByUser] = useState(false);

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  const updateState = useCallback((next: AuthState) => {
    setState((prev) => (sameAuthState(prev, next) ? prev : next));
  }, []);

  const refreshSession = useCallback(async (): Promise<AuthState | null> => {
    try {
      const data = await api.getAuthSession();
      if (!data) {
        setSessionToken(null);
        updateState(EMPTY_AUTH_STATE);
        return null;
      }
      const nextState = authStateFrom(data);
      updateState(nextState);
      return nextState;
    } catch {
      return latestStateRef.current.userId ? latestStateRef.current : null;
    }
  }, [updateState]);

  useEffect(() => {
    void refreshSession().finally(() => setLoading(false));
  }, [refreshSession]);

  useEffect(() => {
    const handleFocus = () => {
      void refreshSession();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshSession();
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshSession]);

  const login = async (email: string, password: string) => {
    const data = await callAuth<AuthUserDto>("/login", { email, password });
    setSessionToken(data.access_token ?? null);
    setSignedOutByUser(false);
    setState(authStateFrom(data));
  };

  const register = (name: string, email: string, password: string) =>
    callAuthForMessage("/register", { name, email, password });

  const resendVerification = (email: string) =>
    callAuthForMessage("/resend-verification", { email });

  const verifyEmail = async (token: string) => {
    const message = await callAuthForMessage("/verify-email", { token });
    await refreshSession();
    return message;
  };

  const forgotPassword = (email: string) =>
    callAuthForMessage("/forgot-password", { email });

  const resetPassword = (token: string, newPassword: string) =>
    callAuthForMessage("/reset-password", { token, new_password: newPassword });

  const logout = async () => {
    try {
      await callAuth<MessageDto>("/logout", {});
    } finally {
      setSessionToken(null);
      setSignedOutByUser(true);
      setState(EMPTY_AUTH_STATE);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        resendVerification,
        verifyEmail,
        forgotPassword,
        resetPassword,
        refreshSession,
        logout,
        loading,
        signedOutByUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
