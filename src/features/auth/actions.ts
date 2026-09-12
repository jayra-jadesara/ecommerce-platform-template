"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/config/site";
import { mapAuthError } from "@/features/auth/errors";
import { safeAdminNextPath, safeInternalPath } from "@/features/auth/redirect";
import {
  forgotPasswordSchema,
  loginSchema,
  profileUpdateSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/features/auth/validations";
import { requireUser } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import {
  unexpectedFailure,
  runLoggedMutation,
} from "@/features/error-monitoring/unexpected";
import {
  enforceRateLimit,
  rateLimitErrorMessage,
} from "@/lib/security/server-rate-limit";

export type AuthActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

async function guardAuthRate(): Promise<AuthActionResult | null> {
  const limited = await enforceRateLimit("auth");
  if (!limited.allowed) {
    return { ok: false, error: rateLimitErrorMessage(limited.retryAfterMs) };
  }
  return null;
}

export async function loginAction(
  raw: unknown,
  nextPath?: string,
): Promise<AuthActionResult> {
  const blocked = await guardAuthRate();
  if (blocked) return blocked;

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) return { ok: false, error: mapAuthError(error) };

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

  redirect(safeInternalPath(nextPath, "/account"));
}

export async function registerAction(raw: unknown): Promise<AuthActionResult> {
  const blocked = await guardAuthRate();
  if (blocked) return blocked;

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          first_name: parsed.data.firstName,
          last_name: parsed.data.lastName,
        },
        emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/account`,
      },
    });

    if (error) return { ok: false, error: mapAuthError(error) };

    // Supabase anti-enumeration: existing emails often return a user with no
    // identities and no error — treat that as "already registered".
    const identities = data.user?.identities;
    if (data.user && Array.isArray(identities) && identities.length === 0) {
      return {
        ok: false,
        error: "An account with this email already exists. Please sign in.",
      };
    }

    if (!data.user) {
      return {
        ok: false,
        error: "Unable to create your account. Please try again.",
      };
    }

    // Email confirmation disabled → session present → continue into the store.
    if (data.session) {
      try {
        const { mergeGuestCartIntoCustomer } = await import(
          "@/features/cart/service"
        );
        await mergeGuestCartIntoCustomer(data.user.id);
      } catch {
        // Cart merge is best-effort; registration must still succeed.
      }
      redirect("/account");
    }

    return {
      ok: true,
      message:
        "Account created. Check your email to verify your account, then sign in.",
    };
  } catch (error) {
    // Next.js redirect() throws a special digest — must not be swallowed.
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return { ok: false, error: mapAuthError(error) };
  }
}

export async function logoutAction(redirectTo = "/"): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(safeInternalPath(redirectTo, "/"));
}

export async function forgotPasswordAction(
  raw: unknown,
): Promise<AuthActionResult> {
  const blocked = await guardAuthRate();
  if (blocked) return blocked;

  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
  });

  if (error) return { ok: false, error: mapAuthError(error) };

  return {
    ok: true,
    message: "If an account exists for that email, a reset link has been sent.",
  };
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
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase
        .from("user_profiles")
        .update({
          first_name: parsed.data.firstName,
          last_name: parsed.data.lastName,
          phone: parsed.data.phone || null,
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
  if (blocked) return blocked;

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
    return { ok: false, error: mapAuthError(error ?? "Invalid login") };
  }

  const { data: admin } = await supabase
    .from("admin_users")
    .select("user_id, is_active")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!admin || !admin.is_active) {
    await supabase.auth.signOut();
    return {
      ok: false,
      error: "You do not have admin access for this store.",
    };
  }

  const dest = safeAdminNextPath(
    nextPath,
    getAdminPath(),
    adminLoginFallback,
  );
  redirect(dest);
}
