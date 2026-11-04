import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/apiBase";
import { setSessionToken, withAuthHeaders } from "@/lib/sessionToken";
import {
  fetchWithUserFacingError,
  getUserFacingError,
  parseJsonResponse,
  USER_FACING_ERRORS,
} from "@/lib/userFacingErrors";
import type { AuthActions } from "@/pages/auth/authActions";
import type { AuthUserDto, MessageDto } from "@/types/api";

interface AuthState {
  userId: string | null;
  name: string | null;
  email: string | null;
  emailVerified: boolean;
}

/** The session, plus the account calls the signed-out screens make (`AuthActions`). */
interface AuthContextValue extends AuthState, AuthActions {
  refreshSession(): Promise<AuthState | null>;
  logout(): Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
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

/** An account call the server answers with a message to show. */
async function callAuthForMessage(path: string, body: object): Promise<string> {
  const data = await callAuth<MessageDto>(path, body);
  return data.message;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(EMPTY_AUTH_STATE);
  const latestStateRef = useRef<AuthState>(EMPTY_AUTH_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  /** Sets the session, keeping the current object when nothing changed so consumers don't re-render. */
  const updateState = useCallback((next: AuthState) => {
    setState((prev) => (sameAuthState(prev, next) ? prev : next));
  }, []);

  const refreshSession = useCallback(async (): Promise<AuthState | null> => {
    try {
      const res = await fetch(apiUrl("/api/auth/me"), {
        credentials: "include",
        headers: withAuthHeaders(),
      });
      if (res.status === 401 || res.status === 403) {
        setSessionToken(null);
        updateState(EMPTY_AUTH_STATE);
        return null;
      }
      if (!res.ok) {
        throw new Error(await getUserFacingError(res, USER_FACING_ERRORS.account));
      }
      const data = await parseJsonResponse<AuthUserDto>(res, USER_FACING_ERRORS.account);
      const nextState = authStateFrom(data);
      updateState(nextState);
      return nextState;
    } catch {
      // Network/CORS/parser issues should not immediately clear a valid session.
      return latestStateRef.current.userId ? latestStateRef.current : null;
    }
  }, [updateState]);

  // On mount, try to re-hydrate from session cookie.
  useEffect(() => {
    refreshSession().finally(() => setLoading(false));
  }, [refreshSession]);

  // Keep auth state in sync when user returns to a tab after actions in another tab.
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
    setState(authStateFrom(data));
  };

  const register: AuthActions["register"] = (name, email, password, options) =>
    callAuthForMessage("/register", {
      name,
      email,
      password,
      handicap: options?.handicap ?? null,
      home_course_id: options?.home_course_id ?? null,
    });

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

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
