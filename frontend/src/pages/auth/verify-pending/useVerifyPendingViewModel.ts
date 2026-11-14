import { useCallback, useEffect, useRef, useState } from "react";
import { messageFrom } from "@/lib/userFacingErrors";
import type { AuthActions, SessionCheck } from "../authActions";
import { useResendVerification } from "../useResendVerification";

const VERIFY_POLL_MS = 3000;

export interface VerifyPendingArrival {
  email?: string | null;
  flash?: string | null;
}

export interface VerifyPendingViewModel {
  email: string;
  setEmail: (email: string) => void;
  notice: string | null;
  error: string | null;
  resending: boolean;
  resend: () => void;
}

export function useVerifyPendingViewModel(
  auth: Pick<AuthActions, "resendVerification" | "refreshSession">,
  session: SessionCheck,
  arrival: VerifyPendingArrival,
  onVerified: () => void,
): VerifyPendingViewModel {
  const [email, setEmail] = useState(() => (arrival.email ?? "").trim());
  const [missingEmail, setMissingEmail] = useState(false);
  const resendLink = useResendVerification(auth);
  const { mutate: sendLink } = resendLink;
  const verified = !!session.userId && session.emailVerified;

  const latestOnVerified = useRef(onVerified);
  useEffect(() => {
    latestOnVerified.current = onVerified;
  }, [onVerified]);

  const { refreshSession } = auth;
  useEffect(() => {
    if (verified) {
      latestOnVerified.current();
      return;
    }
    let active = true;
    const check = async () => {
      const latest = await refreshSession();
      if (active && latest?.userId && latest.emailVerified) latestOnVerified.current();
    };
    void check();
    const timer = setInterval(() => void check(), VERIFY_POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [verified, refreshSession]);

  const resend = useCallback(() => {
    const address = email.trim();
    if (!address) {
      setMissingEmail(true);
      return;
    }
    setMissingEmail(false);
    sendLink(address);
  }, [email, sendLink]);

  return {
    email,
    setEmail: (next) => {
      setEmail(next);
      setMissingEmail(false);
    },
    notice: resendLink.data ?? (resendLink.isIdle ? (arrival.flash ?? null) : null),
    error: missingEmail
      ? "Enter your email to resend the verification link."
      : resendLink.error
        ? messageFrom(resendLink.error, "Could not resend verification email.")
        : null,
    resending: resendLink.isPending,
    resend,
  };
}
