"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabasePublicEnvOptional } from "@/lib/supabase/env";
import { LogoutButton } from "@/features/auth/components/LogoutButton";

type AuthSnapshot = {
  ready: boolean;
  email: string | null;
};

let snapshot: AuthSnapshot = { ready: false, email: null };
const listeners = new Set<() => void>();
let subscribed = false;

function emit() {
  listeners.forEach((listener) => listener());
}

function ensureAuthSubscription() {
  if (subscribed || typeof window === "undefined") return;
  subscribed = true;

  if (!getSupabasePublicEnvOptional()) {
    snapshot = { ready: true, email: null };
    emit();
    return;
  }

  const supabase = createSupabaseBrowserClient();

  void supabase.auth.getUser().then(({ data }) => {
    snapshot = { ready: true, email: data.user?.email ?? null };
    emit();
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    snapshot = { ready: true, email: session?.user?.email ?? null };
    emit();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  ensureAuthSubscription();
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

const SERVER_SNAPSHOT: AuthSnapshot = { ready: false, email: null };

function getServerSnapshot(): AuthSnapshot {
  return SERVER_SNAPSHOT;
}

export function HeaderAuthLinks({ compact = false }: { compact?: boolean }) {
  const { ready, email } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (!ready) {
    return (
      <span
        className={compact ? "inline-block h-8 w-8" : "inline-block h-8 w-16"}
        aria-hidden
      />
    );
  }

  if (email) {
    return (
      <div className="flex items-center gap-1">
        {!compact ? (
          <Link
            href="/account"
            className="rounded-md px-2 py-1 text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          >
            Account
          </Link>
        ) : null}
        <LogoutButton />
      </div>
    );
  }

  if (compact) {
    return (
      <Link
        href="/login"
        className="rounded-md px-2 py-1 text-sm font-medium text-[var(--color-header-foreground)] hover:text-[var(--color-primary)]"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/login"
        className="rounded-md px-2 py-1 text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
      >
        Sign in
      </Link>
      <Link
        href="/register"
        className="rounded-md border border-[var(--color-border)] bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-[var(--color-button-foreground)]"
      >
        Register
      </Link>
    </div>
  );
}
