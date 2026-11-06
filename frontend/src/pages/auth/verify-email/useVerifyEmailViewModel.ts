import { messageFrom } from "@/lib/userFacingErrors";
import type { AuthActions } from "../authActions";
import { useVerifyEmail } from "../useVerifyEmail";

export type VerifyEmailStatus = "missing" | "verifying" | "verified" | "failed";

export interface VerifyEmailViewModel {
  status: VerifyEmailStatus;
  /** The server's word once it has answered; null while there is no answer to show. */
  serverMessage: string | null;
}

/** Where the emailed link's token stands: absent, being spent, spent, or refused. */
export function useVerifyEmailViewModel(
  auth: Pick<AuthActions, "verifyEmail">,
  token: string,
): VerifyEmailViewModel {
  const trimmedToken = token.trim();
  const verification = useVerifyEmail(auth, trimmedToken);

  if (!trimmedToken) return { status: "missing", serverMessage: null };
  if (verification.isSuccess) return { status: "verified", serverMessage: verification.data };
  if (verification.isError) {
    return { status: "failed", serverMessage: messageFrom(verification.error, "Could not verify email.") };
  }
  return { status: "verifying", serverMessage: null };
}
