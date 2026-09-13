/** Maps Supabase/auth errors to safe, user-facing messages. */
export function mapAuthError(error: unknown): string {
  const message =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "";

  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid login") ||
    normalized.includes("invalid credentials") ||
    normalized.includes("email not confirmed") ||
    normalized.includes("invalid_grant")
  ) {
    if (normalized.includes("email not confirmed")) {
      return "Please verify your email before signing in.";
    }
    return "Email or password is incorrect.";
  }

  if (
    normalized.includes("already registered") ||
    normalized.includes("user already exists") ||
    normalized.includes("already been registered") ||
    normalized.includes("email address is already")
  ) {
    return "An account with this email already exists. Please sign in.";
  }

  if (
    normalized.includes("error sending") ||
    normalized.includes("confirmation email") ||
    normalized.includes("unable to send") ||
    normalized.includes("smtp")
  ) {
    return "We couldn't send the verification email. Try again later or contact support.";
  }

  if (
    normalized.includes("signups not allowed") ||
    normalized.includes("signup is disabled") ||
    normalized.includes("signups disabled")
  ) {
    return "New registrations are temporarily unavailable.";
  }

  if (normalized.includes("password")) {
    if (normalized.includes("weak") || normalized.includes("least")) {
      return "Password does not meet the security requirements.";
    }
  }

  if (
    normalized.includes("database") ||
    normalized.includes("saving new user") ||
    normalized.includes("database error")
  ) {
    return "We couldn't create your account right now. Please try again.";
  }

  if (
    normalized.includes("over_email_send_rate_limit") ||
    normalized.includes("email rate limit") ||
    normalized.includes("rate limit") ||
    normalized.includes("too many")
  ) {
    if (
      normalized.includes("email") ||
      normalized.includes("over_email_send_rate_limit")
    ) {
      return "Too many verification emails were sent. Wait a few minutes, then try again — or sign in if this email is already registered.";
    }
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (normalized.includes("network") || normalized.includes("fetch")) {
    return "Network error. Check your connection and try again.";
  }

  // Never surface Next.js control-flow errors as auth failures.
  if (normalized.includes("next_redirect") || normalized.includes("next_not_found")) {
    return "Something went wrong. Please try again.";
  }

  return "Something went wrong. Please try again.";
}
