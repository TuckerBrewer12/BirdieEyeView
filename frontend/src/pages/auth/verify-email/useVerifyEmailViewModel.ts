import { messageFrom } from "@/lib/userFacingErrors";
import type { AuthActions } from "../authActions";
import { useVerifyEmail } from "../useVerifyEmail";

export type VerifyEmailStatus = "missing" | "verifying" | "verified" | "failed";

export interface VerifyEmailViewModel {
  status: VerifyEmailStatus;
  message: string;
}

/** Where the emailed link's token stands: absent, being spent, spent, or refused. */
export function useVerifyEmailViewModel(
  auth: Pick<AuthActions, "verifyEmail">,
  token: string,
): VerifyEmailViewModel {
  const trimmedToken = token.trim();
  const verification = useVerifyEmail(auth, trimmedToken);

  if (!trimmedToken) {
    return { status: "missing", message: "Missing verification token. Use the link from your email." };
  }
  if (verification.isSuccess) {
    return { status: "verified", message: verification.data };
  }
  if (verification.isError) {
    return { status: "failed", message: messageFrom(verification.error, "Could not verify email.") };
  }
  return { status: "verifying", message: "Verifying your email…" };
}
