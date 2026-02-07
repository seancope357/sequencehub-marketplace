export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
export const NAME_MAX_LENGTH = 80;
export const EMAIL_MAX_LENGTH = 254;

export interface PasswordChecks {
  minLength: boolean;
  hasLowercase: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
}

export function normalizeEmail(rawEmail: string): string {
  return rawEmail.trim().toLowerCase();
}

export function normalizeName(rawName: string | undefined): string | undefined {
  const trimmed = rawName?.trim();
  return trimmed ? trimmed : undefined;
}

export function getPasswordChecks(password: string): PasswordChecks {
  return {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };
}

export function isPasswordStrong(password: string): boolean {
  const checks = getPasswordChecks(password);
  return checks.minLength && checks.hasLowercase && checks.hasUppercase && checks.hasNumber;
}

export function getPasswordStrengthMessage(password: string): string {
  const checks = getPasswordChecks(password);

  if (!checks.minLength) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`;
  }
  if (!checks.hasLowercase) {
    return 'Password must include at least one lowercase letter';
  }
  if (!checks.hasUppercase) {
    return 'Password must include at least one uppercase letter';
  }
  if (!checks.hasNumber) {
    return 'Password must include at least one number';
  }

  return 'Password looks good';
}

export function isValidEmail(email: string): boolean {
  // Intentionally conservative validation that covers practical email formats.
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
