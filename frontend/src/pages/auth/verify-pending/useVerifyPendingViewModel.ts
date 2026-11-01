import { useCallback, useEffect, useRef, useState } from "react";
import { messageFrom } from "@/lib/userFacingErrors";
import type { AuthActions, SessionCheck } from "../authActions";
import { useResendVerification } from "../useResendVerification";

/** How often the page asks whether the link has been opened, in another tab or on a phone. */
export const VERIFY_POLL_MS = 3000;

/** What Register hands over on the way here. */
export interface VerifyPendingArrival {
  email?: string | null;
  flash?: string | null;
}

export interface VerifyPendingViewModel {
  email: string;
  setEmail: (email: string) => void;
  /** Register's "check your email", or the server's word that another link went out. */
  notice: string | null;
  error: string | null;
  resending: boolean;
  resend: () => void;
}

/**
 * Waits for the golfer to open the link. The session is checked on arrival and every few seconds
 * after; once it is signed in and verified, `onVerified` runs and the page has nothing left to do.
 */
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
