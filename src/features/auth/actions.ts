"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/config/site";
import { mapAuthError } from "@/features/auth/errors";
import { safeAdminNextPath, safeInternalPath } from "@/features/auth/redirect";
import {
  forgotPasswordSchema,
  loginSchema,
  profileUpdateSchema,
  registerSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "@/features/auth/validations";
import { requireUser } from "@/features/auth/session";
import {
  clearSessionStarted,
  markSessionStarted,
} from "@/features/auth/session-started";
import { getAdminPath } from "@/config/admin-route";
import {
  unexpectedFailure,
  runLoggedMutation,
} from "@/features/error-monitoring/unexpected";
import {
  enforceRateLimit,
  rateLimitErrorMessage,
} from "@/lib/security/server-rate-limit";
import { logAuthFailure } from "@/features/auth/log-auth-failure";
import {
  clearPasswordRecoveryCookie,
  hashRecoveryAnswer,
  normalizePhoneForCompare,
  readPasswordRecoveryUserId,
  setPasswordRecoveryCookie,
  verifyRecoveryAnswer,
} from "@/features/auth/recovery";
import { isRecoveryQuestionId } from "@/features/auth/recovery-questions";
import { getStorePhoneCountryCode } from "@/lib/store-location";
import { formatPhoneForStorage } from "@/lib/phone";

export type AuthActionResult =
  | {
      ok: true;
      message?: string;
      verified?: boolean;
      email?: string | null;
      displayName?: string | null;
      next?: string;
    }
  | { ok: false; error: string };

const RECOVERY_VERIFY_FAIL =
  "Could not verify details. Check your email, account number, and security answer.";

async function guardAuthRate(): Promise<{ ok: false; error: string } | null> {
  const limited = await enforceRateLimit("auth");
  if (!limited.allowed) {
    return { ok: false, error: rateLimitErrorMessage(limited.retryAfterMs) };
  }
  return null;
}

async function persistRecoverySecret(input: {
  userId: string;
  questionId: string;
  answer: string;
}): Promise<void> {
  const admin = createSupabaseServiceClient();
  const { error } = await admin
    .from("user_profiles")
    .update({
      recovery_question_id: input.questionId,
      recovery_answer_hash: hashRecoveryAnswer(input.answer),
    })
    .eq("id", input.userId);
  if (error) {
    throw error;
  }
}

function isEmailSendBlocked(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const normalized = `${error.message ?? ""} ${error.code ?? ""}`.toLowerCase();
  return (
    normalized.includes("over_email_send_rate_limit") ||
    normalized.includes("email rate limit") ||
    normalized.includes("error sending") ||
    normalized.includes("confirmation email") ||
    normalized.includes("unable to send") ||
    normalized.includes("smtp")
  );
}

/**
 * Create + sign in without sending a confirmation email (bypasses Auth mailer limits).
 * Requires SUPABASE_SERVICE_ROLE_KEY.
 */
async function registerViaServiceRole(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  fullPhone: string;
  countryCode: string;
  recoveryQuestionId: string;
  recoveryAnswer: string;
}): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return { ok: false, error: mapAuthError({ message: "email rate limit exceeded" }) };
  }

  try {
    const admin = createSupabaseServiceClient();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.fullPhone,
        country_code: input.countryCode,
        recovery_question_id: input.recoveryQuestionId,
      },
    });

    if (createError) {
      const msg = createError.message.toLowerCase();
      if (
        msg.includes("already") ||
        msg.includes("registered") ||
        msg.includes("exists")
      ) {
        return {
          ok: false,
          error: "An account with this email already exists. Please sign in.",
        };
      }
      await logAuthFailure({
        operation: "register.adminCreateUser",
        message: createError.message,
        error: createError,
        route: "/register",
        userLogin: input.email,
        severity: "ERROR",
      });
      return { ok: false, error: mapAuthError(createError) };
    }

    if (!created.user) {
      await logAuthFailure({
        operation: "register.adminCreateUser",
        message: "admin createUser returned no user",
        route: "/register",
        userLogin: input.email,
      });
      return {
        ok: false,
        error: "Unable to create your account. Please try again.",
      };
    }

    try {
      await persistRecoverySecret({
        userId: created.user.id,
        questionId: input.recoveryQuestionId,
        answer: input.recoveryAnswer,
      });
    } catch (persistError) {
      await logAuthFailure({
        operation: "register.persistRecovery",
        message:
          persistError instanceof Error
            ? persistError.message
            : "Failed to save recovery secret",
        error: persistError,
        route: "/register",
        userLogin: input.email,
        severity: "WARNING",
      });
    }

    try {
      const adminProfile = createSupabaseServiceClient();
      await adminProfile
        .from("user_profiles")
        .update({
          first_name: input.firstName,
          last_name: input.lastName,
          phone: input.fullPhone,
        })
        .eq("id", created.user.id);
    } catch {
      // best-effort
    }

    return { ok: true, userId: created.user.id };
  } catch (error) {
    await logAuthFailure({
      operation: "register.serviceRole",
      message: error instanceof Error ? error.message : "Service role register failed",
      error,
      route: "/register",
      userLogin: input.email,
    });
    return { ok: false, error: mapAuthError(error) };
  }
}

/** Confirm email so the user can sign in without a verification link. */
async function confirmEmailForSignIn(userId: string): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return;
  const admin = createSupabaseServiceClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });
  if (error) {
    throw error;
  }
}

export async function loginAction(
  raw: unknown,
  nextPath?: string,
): Promise<AuthActionResult> {
  const blocked = await guardAuthRate();
  if (blocked) {
    await logAuthFailure({
      operation: "login.rateLimit",
      message: blocked.error,
      route: "/login",
      severity: "WARNING",
    });
    return blocked;
  }

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    await logAuthFailure({
      operation: "login.signInWithPassword",
      message: error.message,
      error,
      route: "/login",
      userLogin: parsed.data.email,
      severity: "WARNING",
      errorCode:
        error && typeof error === "object" && "code" in error
          ? String((error as { code: unknown }).code)
          : null,
      httpStatus: error.status ?? null,
    });
    return { ok: false, error: mapAuthError(error) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    try {
      const { mergeGuestCartIntoCustomer } = await import(
        "@/features/cart/service"
      );
      await mergeGuestCartIntoCustomer(user.id);
    } catch {
      // Cart merge is best-effort; login must still succeed.
    }
  }

  const meta = user?.user_metadata ?? {};
  const first = String(meta.first_name ?? meta.firstName ?? "").trim();
  const last = String(meta.last_name ?? meta.lastName ?? "").trim();
  const fullName = `${first} ${last}`.trim();
  const email = user?.email ?? parsed.data.email;

  await markSessionStarted();

  // Client navigates after applying header auth (faster navbar update).
  return {
    ok: true,
    email,
    displayName: fullName || email.split("@")[0] || email,
    next: safeInternalPath(nextPath, "/"),
  };
}

export async function registerAction(raw: unknown): Promise<AuthActionResult> {
  const blocked = await guardAuthRate();
  if (blocked) {
    await logAuthFailure({
      operation: "register.rateLimit",
      message: blocked.error,
      route: "/register",
      severity: "WARNING",
    });
    return blocked;
  }

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const dialCode = await getStorePhoneCountryCode();
  const fullPhone = formatPhoneForStorage(parsed.data.phone, dialCode);
  let redirectToLogin = false;

  try {
    const supabase = await createSupabaseServerClient();
    const siteUrl = getSiteUrl();

    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          first_name: parsed.data.firstName,
          last_name: parsed.data.lastName,
          phone: fullPhone,
          country_code: dialCode,
          recovery_question_id: parsed.data.recoveryQuestionId,
        },
        emailRedirectTo: `${siteUrl}/auth/callback?next=/`,
      },
    });

    if (error) {
      await logAuthFailure({
        operation: "register.signUp",
        message: error.message,
        error,
        route: "/register",
        userLogin: parsed.data.email,
        severity: isEmailSendBlocked(error) ? "WARNING" : "ERROR",
        errorCode:
          error && typeof error === "object" && "code" in error
            ? String((error as { code: unknown }).code)
            : null,
        httpStatus: error.status ?? null,
      });

      if (isEmailSendBlocked(error)) {
        const fallback = await registerViaServiceRole({
          email: parsed.data.email,
          password: parsed.data.password,
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          fullPhone,
          countryCode: dialCode,
          recoveryQuestionId: parsed.data.recoveryQuestionId,
          recoveryAnswer: parsed.data.recoveryAnswer,
        });
        if (!fallback.ok) {
          return { ok: false, error: fallback.error };
        }
        redirectToLogin = true;
      } else {
        return { ok: false, error: mapAuthError(error) };
      }
    } else {
      // Supabase anti-enumeration: existing emails often return a user with no
      // identities and no error — treat that as "already registered".
      const identities = data.user?.identities;
      if (data.user && Array.isArray(identities) && identities.length === 0) {
        await logAuthFailure({
          operation: "register.duplicateEmail",
          message: "Signup attempted for existing email (empty identities)",
          route: "/register",
          userLogin: parsed.data.email,
          severity: "INFO",
        });
        return {
          ok: false,
          error: "An account with this email already exists. Please sign in.",
        };
      }

      if (!data.user) {
        await logAuthFailure({
          operation: "register.signUp",
          message: "signUp returned no user",
          route: "/register",
          userLogin: parsed.data.email,
        });
        return {
          ok: false,
          error: "Unable to create your account. Please try again.",
        };
      }

      try {
        await supabase
          .from("user_profiles")
          .update({
            first_name: parsed.data.firstName,
            last_name: parsed.data.lastName,
            phone: fullPhone,
            recovery_question_id: parsed.data.recoveryQuestionId,
          })
          .eq("id", data.user.id);
      } catch {
        // Profile sync is best-effort; account creation already succeeded.
      }

      try {
        await persistRecoverySecret({
          userId: data.user.id,
          questionId: parsed.data.recoveryQuestionId,
          answer: parsed.data.recoveryAnswer,
        });
      } catch (persistError) {
        await logAuthFailure({
          operation: "register.persistRecovery",
          message:
            persistError instanceof Error
              ? persistError.message
              : "Failed to save recovery secret",
          error: persistError,
          route: "/register",
          userLogin: parsed.data.email,
          severity: "WARNING",
        });
      }

      // Hosted projects often require email confirm — confirm via admin so
      // the user can sign in immediately (no verify-email step).
      if (!data.session) {
        try {
          await confirmEmailForSignIn(data.user.id);
        } catch (confirmError) {
          await logAuthFailure({
            operation: "register.confirmEmail",
            message:
              confirmError instanceof Error
                ? confirmError.message
                : "Failed to confirm email",
            error: confirmError,
            route: "/register",
            userLogin: parsed.data.email,
            severity: "WARNING",
          });
        }
      } else {
        // Drop auto-session so the user lands on the sign-in page as requested.
        await supabase.auth.signOut();
      }

      redirectToLogin = true;
    }
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    await logAuthFailure({
      operation: "register.unexpected",
      message: error instanceof Error ? error.message : "Unexpected register failure",
      error,
      route: "/register",
      userLogin: parsed.data.email,
    });
    return { ok: false, error: mapAuthError(error) };
  }

  if (redirectToLogin) {
    redirect("/login");
  }

  return {
    ok: true,
    message: "Account created. Please sign in.",
  };
}

export async function logoutAction(redirectTo = "/"): Promise<void> {
  try {
    const { clearImpersonationCookie } = await import(
      "@/features/auth/impersonation"
    );
    await clearImpersonationCookie();
  } catch {
    // Still sign out below.
  }
  try {
    await clearSessionStarted();
  } catch {
    // Still sign out below.
  }
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(safeInternalPath(redirectTo, "/"));
}

export async function verifyPasswordRecoveryAction(
  raw: unknown,
): Promise<AuthActionResult> {
  const blocked = await guardAuthRate();
  if (blocked) return blocked;

  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    await logAuthFailure({
      operation: "passwordRecovery.verify",
      message: "Missing SUPABASE_SERVICE_ROLE_KEY",
      route: "/forgot-password",
      severity: "ERROR",
    });
    return { ok: false, error: RECOVERY_VERIFY_FAIL };
  }

  try {
    const admin = createSupabaseServiceClient();
    const { data: userId, error: lookupError } = await admin.rpc(
      "lookup_auth_user_id_by_email",
      { p_email: parsed.data.email },
    );

    if (lookupError || !userId) {
      await logAuthFailure({
        operation: "passwordRecovery.verify",
        message: lookupError?.message ?? "User not found",
        error: lookupError ?? undefined,
        route: "/forgot-password",
        userLogin: parsed.data.email,
        severity: "INFO",
      });
      return { ok: false, error: RECOVERY_VERIFY_FAIL };
    }

    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("phone, recovery_question_id, recovery_answer_hash")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profile) {
      return { ok: false, error: RECOVERY_VERIFY_FAIL };
    }

    const dialCode = await getStorePhoneCountryCode();
    const phoneOk =
      normalizePhoneForCompare(profile.phone ?? "", dialCode) ===
      normalizePhoneForCompare(
        formatPhoneForStorage(parsed.data.phone, dialCode),
        dialCode,
      );
    const questionOk =
      profile.recovery_question_id === parsed.data.recoveryQuestionId;
    const answerOk = verifyRecoveryAnswer(
      parsed.data.recoveryAnswer,
      profile.recovery_answer_hash,
    );

    if (!phoneOk || !questionOk || !answerOk) {
      await logAuthFailure({
        operation: "passwordRecovery.verify",
        message: "Recovery verification failed",
        route: "/forgot-password",
        userLogin: parsed.data.email,
        severity: "WARNING",
      });
      return { ok: false, error: RECOVERY_VERIFY_FAIL };
    }

    await setPasswordRecoveryCookie(userId);
    return {
      ok: true,
      verified: true,
      message: "Verified. Choose a new password.",
    };
  } catch (error) {
    await logAuthFailure({
      operation: "passwordRecovery.verify",
      message: error instanceof Error ? error.message : "Unexpected verify failure",
      error,
      route: "/forgot-password",
      userLogin: parsed.data.email,
    });
    return { ok: false, error: RECOVERY_VERIFY_FAIL };
  }
}

/** @deprecated Prefer verifyPasswordRecoveryAction — kept as alias for older imports. */
export async function forgotPasswordAction(
  raw: unknown,
): Promise<AuthActionResult> {
  return verifyPasswordRecoveryAction(raw);
}

export async function resetPasswordWithRecoveryAction(
  raw: unknown,
): Promise<AuthActionResult> {
  const blocked = await guardAuthRate();
  if (blocked) return blocked;

  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const userId = await readPasswordRecoveryUserId();
  if (!userId) {
    return {
      ok: false,
      error: "Recovery session expired. Verify your details again.",
    };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return { ok: false, error: "Unable to update password right now." };
  }

  try {
    const admin = createSupabaseServiceClient();
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: parsed.data.password,
    });

    if (error) {
      await logAuthFailure({
        operation: "passwordRecovery.reset",
        message: error.message,
        error,
        route: "/forgot-password",
        severity: "ERROR",
      });
      return { ok: false, error: mapAuthError(error) };
    }

    await clearPasswordRecoveryCookie();
    return {
      ok: true,
      message: "Password updated. You can sign in with your new password.",
    };
  } catch (error) {
    await logAuthFailure({
      operation: "passwordRecovery.reset",
      message: error instanceof Error ? error.message : "Unexpected reset failure",
      error,
      route: "/forgot-password",
    });
    return { ok: false, error: mapAuthError(error) };
  }
}

export async function resetPasswordAction(
  raw: unknown,
): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) return { ok: false, error: mapAuthError(error) };

  return { ok: true, message: "Password updated. You can continue to your account." };
}

/**
 * Signed-in user changes their password after verifying the current one.
 * Available to any authenticated user (admin UI entry point uses this).
 */
export async function changePasswordAction(
  raw: unknown,
): Promise<AuthActionResult> {
  const blocked = await guardAuthRate();
  if (blocked) return blocked;

  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return { ok: false, error: "You must be signed in to change your password." };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });

  if (verifyError) {
    return { ok: false, error: "Current password is incorrect." };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    await logAuthFailure({
      operation: "password.change",
      message: error.message,
      error,
      route: getAdminPath("/dashboard"),
      severity: "ERROR",
    });
    return { ok: false, error: mapAuthError(error) };
  }

  return { ok: true, message: "Password updated." };
}

export async function updateProfileAction(
  raw: unknown,
): Promise<AuthActionResult> {
  const user = await requireUser();
  const parsed = profileUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  return runLoggedMutation(
    {
      type: "AUTH",
      source: "SERVER",
      operation: "UPDATE_PROFILE",
      feature: "AUTH",
      entityType: "user_profile",
      entityId: user.id,
      route: "/account/profile",
    },
    async () => {
      const dialCode = await getStorePhoneCountryCode();
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase
        .from("user_profiles")
        .update({
          first_name: parsed.data.firstName,
          last_name: parsed.data.lastName,
          phone: formatPhoneForStorage(parsed.data.phone, dialCode),
        })
        .eq("id", user.id);

      if (error) {
        return unexpectedFailure({
          type: "AUTH",
          source: "DATABASE",
          operation: "UPDATE_PROFILE",
          feature: "AUTH",
          message: error.message || "Unable to update profile",
          error,
          entityType: "user_profile",
          entityId: user.id,
          route: "/account/profile",
        });
      }

      const q = parsed.data.recoveryQuestionId?.trim() ?? "";
      const a = parsed.data.recoveryAnswer?.trim() ?? "";
      if (q && a && isRecoveryQuestionId(q)) {
        try {
          await persistRecoverySecret({
            userId: user.id,
            questionId: q,
            answer: a,
          });
        } catch (persistError) {
          return unexpectedFailure({
            type: "AUTH",
            source: "DATABASE",
            operation: "UPDATE_RECOVERY",
            feature: "AUTH",
            message:
              persistError instanceof Error
                ? persistError.message
                : "Unable to update security question",
            error: persistError,
            entityType: "user_profile",
            entityId: user.id,
            route: "/account/profile",
          });
        }
      }

      revalidatePath("/account/profile");
      return { ok: true as const, message: "Profile updated." };
    },
  );
}

export async function adminLoginAction(
  raw: unknown,
  nextPath?: string,
  adminLoginFallback = getAdminPath("/dashboard"),
): Promise<AuthActionResult> {
  const blocked = await guardAuthRate();
  if (blocked) {
    await logAuthFailure({
      operation: "adminLogin.rateLimit",
      message: blocked.error,
      route: getAdminPath("/login"),
      severity: "WARNING",
    });
    return blocked;
  }

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    await logAuthFailure({
      operation: "adminLogin.signInWithPassword",
      message: error?.message ?? "Invalid login",
      error: error ?? undefined,
      route: getAdminPath("/login"),
      userLogin: parsed.data.email,
      severity: "WARNING",
    });
    return { ok: false, error: mapAuthError(error ?? "Invalid login") };
  }

  const { data: admin } = await supabase
    .from("admin_users")
    .select("user_id, is_active")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!admin || !admin.is_active) {
    await supabase.auth.signOut();
    await logAuthFailure({
      operation: "adminLogin.unauthorized",
      message: "Non-admin user attempted admin login",
      route: getAdminPath("/login"),
      userLogin: parsed.data.email,
      severity: "WARNING",
      metadata: { userId: data.user.id },
    });
    return {
      ok: false,
      error: "You do not have admin access for this store.",
    };
  }

  await markSessionStarted();

  const dest = safeAdminNextPath(
    nextPath,
    getAdminPath(),
    adminLoginFallback,
  );
  redirect(dest);
}
