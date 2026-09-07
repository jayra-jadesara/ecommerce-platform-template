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
    normalized.includes("already been registered")
  ) {
    return "An account with this email already exists.";
  }

  if (normalized.includes("password")) {
    if (normalized.includes("weak") || normalized.includes("least")) {
      return "Password does not meet the security requirements.";
    }
  }

  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (normalized.includes("network") || normalized.includes("fetch")) {
    return "Network error. Check your connection and try again.";
  }

  return "Something went wrong. Please try again.";
}
