/** Request headers set only by proxy after a validated Supabase getUser(). */
export const AUTH_USER_ID_HEADER = "x-wl-auth-user-id";
export const AUTH_USER_EMAIL_HEADER = "x-wl-auth-user-email";
export const AUTH_LAST_SIGN_IN_HEADER = "x-wl-auth-last-sign-in";

/** Cookie: unix seconds when the current browser login started (set on login). */
export const SESSION_STARTED_COOKIE = "wl_session_started_at";

export const SESSION_STARTED_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 400;
