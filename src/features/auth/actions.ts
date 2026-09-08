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

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
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

  return {
    ok: true,
    message:
      "Account created. Check your email to verify your account if verification is enabled.",
  };
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

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("user_profiles")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      phone: parsed.data.phone || null,
    })
    .eq("id", user.id);

  if (error) return { ok: false, error: mapAuthError(error) };

  revalidatePath("/account/profile");
  return { ok: true, message: "Profile updated." };
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
