const MIN_PASSWORD_LENGTH = 8;

export interface NewPasswordErrors {
  password: string | null;
  confirm: string | null;
}

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

export function isUnverifiedSignIn(message: string | null | undefined): boolean {
  return message?.toLowerCase().includes("email not verified") ?? false;
}
