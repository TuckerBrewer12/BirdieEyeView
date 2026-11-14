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
import type { AuthUserDto, MessageDto, RegisterDto } from "@/types/api";
import { AuthContext, type AuthState } from "./auth";

const EMPTY_AUTH_STATE: AuthState = {
  userId: null,
  name: null,
  email: null,
  emailVerified: false,
};

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(EMPTY_AUTH_STATE);
  const latestStateRef = useRef<AuthState>(EMPTY_AUTH_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  const refreshSession = useCallback(async (): Promise<AuthState | null> => {
    try {
      const data = await api.getAuthSession();
      if (!data) {
        setSessionToken(null);
        setState((prev) =>
          prev.userId === null && prev.name === null && prev.email === null && prev.emailVerified === false
            ? prev
            : EMPTY_AUTH_STATE
        );
        return null;
      }
      const nextState: AuthState = {
        userId: data.user_id,
        name: data.name,
        email: data.email,
        emailVerified: !!data.email_verified,
      };
      setState((prev) =>
        prev.userId === nextState.userId &&
        prev.name === nextState.name &&
        prev.email === nextState.email &&
        prev.emailVerified === nextState.emailVerified
          ? prev
          : nextState
      );
      return nextState;
    } catch {
      return latestStateRef.current.userId ? latestStateRef.current : null;
    }
  }, []);

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
    setState({
      userId: data.user_id,
      name: data.name,
      email: data.email,
      emailVerified: !!data.email_verified,
    });
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await callAuth<RegisterDto>("/register", { name, email, password });
    return data.message;
  };

  const resendVerification = async (email: string) => {
    const data = await callAuth<MessageDto>("/resend-verification", { email });
    return data.message;
  };

  const verifyEmail = async (token: string) => {
    const data = await callAuth<MessageDto>("/verify-email", { token });
    await refreshSession();
    return data.message;
  };

  const forgotPassword = async (email: string) => {
    const data = await callAuth<MessageDto>("/forgot-password", { email });
    return data.message;
  };

  const resetPassword = async (token: string, newPassword: string) => {
    const data = await callAuth<MessageDto>("/reset-password", { token, new_password: newPassword });
    return data.message;
  };

  const logout = async () => {
    try {
      await callAuth<{ message: string }>("/logout", {});
    } finally {
      setSessionToken(null);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
