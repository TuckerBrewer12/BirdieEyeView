import { messageFrom } from "@/lib/userFacingErrors";
import type { AuthActions } from "../authActions";
import { useVerifyEmail } from "../useVerifyEmail";

export type VerifyEmailStatus = "missing" | "verifying" | "verified" | "failed";

export interface VerifyEmailViewModel {
  status: VerifyEmailStatus;
  serverMessage: string | null;
}

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
