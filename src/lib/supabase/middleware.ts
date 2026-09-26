import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getSupabasePublicEnvOptional } from "@/lib/supabase/env";
import type { User } from "@supabase/supabase-js";

/**
 * Refreshes the auth session cookie on each matched request.
 * Returns the validated user so proxy can forward trusted identity headers
 * (x-wl-auth-*) and RSC can skip a second auth.getUser() on the same request.
 * Coarse route guards only — fine-grained RBAC stays in server layouts.
 */
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  user: User | null;
}> {
  let supabaseResponse = NextResponse.next({ request });

  const env = getSupabasePublicEnvOptional();
  if (!env) {
    return { response: supabaseResponse, user: null };
  }

  try {
    const supabase = createServerClient<Database>(env.url, env.anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    return { response: supabaseResponse, user };
  } catch {
    // Invalid env / client construction must not take down the whole app.
    return { response: supabaseResponse, user: null };
  }
}
