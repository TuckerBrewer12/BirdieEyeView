/** The shortest password the server accepts. */
export const MIN_PASSWORD_LENGTH = 8;

export interface NewPasswordErrors {
  password: string | null;
  confirm: string | null;
}

/** Why a new password and its confirmation can't be sent yet, field by field. */
export function newPasswordErrors(password: string, confirm: string): NewPasswordErrors {
  return {
    password:
      password.length < MIN_PASSWORD_LENGTH
        ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
        : null,
    confirm: confirm !== password ? "Passwords do not match." : null,
  };
}

export function hasErrors(errors: object): boolean {
  return Object.values(errors).some((message) => message != null);
}

/**
 * The server refuses an unverified account's sign-in with a 403 whose message says so. That
 * message is the only sign the page gets that a fresh verification link would help.
 */
export function isUnverifiedSignIn(message: string | null | undefined): boolean {
  return message?.toLowerCase().includes("email not verified") ?? false;
}
