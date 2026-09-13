"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import {
  clearHeaderAuthSnapshot,
  getHeaderAuthSnapshot,
  HEADER_AUTH_SERVER_SNAPSHOT,
  setHeaderAuthSnapshot,
  subscribeHeaderAuth,
} from "@/components/common/header-auth-store";
import {
  displayNameFromUser,
  refreshHeaderAuthFromBrowser,
} from "@/components/common/refresh-header-auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabasePublicEnvOptional } from "@/lib/supabase/env";
import { LogoutControl } from "@/features/auth/components/LogoutControl";
import { cn } from "@/lib/cn";
import { isActivePath } from "@/lib/is-active-path";
import { usePathname } from "next/navigation";

let subscribed = false;

function ensureAuthSubscription() {
  if (subscribed || typeof window === "undefined") return;
  subscribed = true;

  if (!getSupabasePublicEnvOptional()) {
    setHeaderAuthSnapshot({ ready: true, email: null, displayName: null });
    return;
  }

  const supabase = createSupabaseBrowserClient();

  void refreshHeaderAuthFromBrowser();

  supabase.auth.onAuthStateChange((_event, session) => {
    setHeaderAuthSnapshot({
      ready: true,
      email: session?.user?.email ?? null,
      displayName: displayNameFromUser(session?.user ?? null),
    });
  });
}

function subscribe(listener: () => void) {
  const unsubscribe = subscribeHeaderAuth(listener);
  ensureAuthSubscription();
  return unsubscribe;
}

export { clearHeaderAuthSnapshot, refreshHeaderAuthFromBrowser };

export function HeaderAccountMenu({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname() || "/";
  const { ready, email, displayName } = useSyncExternalStore(
    subscribe,
    getHeaderAuthSnapshot,
    () => HEADER_AUTH_SERVER_SNAPSHOT,
  );
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const accountActive = isActivePath(pathname, "/account");
  const overviewActive = isActivePath(pathname, "/account", { exact: true });
  const ordersActive = isActivePath(pathname, "/account/orders");

  useEffect(() => {
    void refreshHeaderAuthFromBrowser();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!ready) {
    return (
      <span
        className={compact ? "inline-block h-9 w-9" : "inline-block h-9 w-24"}
        aria-hidden
      />
    );
  }

  if (!email) {
    if (compact) {
      return (
        <Link
          href="/login"
          aria-label="Sign in"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-header-foreground)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] hover:text-[var(--color-primary)]"
        >
          <PersonOutlinedIcon fontSize="small" />
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

  const label = displayName || email.split("@")[0] || "Account";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex max-w-[11rem] items-center gap-1 rounded-full px-1.5 py-1 transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] hover:text-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
          compact ? "h-9" : "min-h-9 pl-2 pr-2",
          accountActive
            ? "bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]"
            : "text-[var(--color-header-foreground)]",
        )}
        aria-current={accountActive ? "true" : undefined}
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
          <PersonOutlinedIcon fontSize="small" aria-hidden />
        </span>
        {!compact ? (
          <>
            <span className="truncate text-sm font-semibold tracking-tight">
              {label}
            </span>
            <KeyboardArrowDownIcon
              fontSize="small"
              className={cn(
                "shrink-0 opacity-70 transition-transform",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </>
        ) : null}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-[var(--radius-default,14px)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_16px_40px_color-mix(in_srgb,var(--color-foreground)_12%,transparent)]"
        >
          <div className="border-b border-[var(--color-border)] px-3.5 py-3">
            <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
              {label}
            </p>
            <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">
              {email}
            </p>
          </div>
          <div className="flex flex-col gap-0.5 p-1.5">
            <Link
              role="menuitem"
              href="/account"
              onClick={() => setOpen(false)}
              aria-current={overviewActive ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                overviewActive
                  ? "bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] font-semibold text-[var(--color-primary)]"
                  : "text-[var(--color-foreground)] hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] hover:text-[var(--color-primary)]",
              )}
            >
              My account
            </Link>
            <Link
              role="menuitem"
              href="/account/orders"
              onClick={() => setOpen(false)}
              aria-current={ordersActive ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                ordersActive
                  ? "bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] font-semibold text-[var(--color-primary)]"
                  : "text-[var(--color-foreground)] hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] hover:text-[var(--color-primary)]",
              )}
            >
              Orders
            </Link>
            <div className="my-1 border-t border-[var(--color-border)]" />
            <LogoutControl variant="text" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
