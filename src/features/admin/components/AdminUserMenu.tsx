"use client";

import KeyOutlinedIcon from "@mui/icons-material/KeyOutlined";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import { useEffect, useId, useRef, useState } from "react";
import { AdminChangePasswordDialog } from "@/features/admin/components/AdminChangePasswordDialog";
import { AdminImpersonationExitButton } from "@/features/admin/components/AdminImpersonationExitButton";
import { LogoutControl } from "@/features/auth/components/LogoutControl";
import { cn } from "@/lib/cn";

type AdminUserMenuProps = {
  email: string | null;
  roleLabel: string;
  initials: string;
  loginRedirect: string;
  storeHref?: string;
  isImpersonating?: boolean;
};

/**
 * Top-bar profile avatar with View store, Change password + Log out / Exit.
 */
export function AdminUserMenu({
  email,
  roleLabel,
  initials,
  loginRedirect,
  storeHref = "/",
  isImpersonating = false,
}: AdminUserMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuOpen ? menuId : undefined}
        title={email ?? "Account"}
        aria-label="Account menu"
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-semibold transition",
          "bg-[color-mix(in_srgb,var(--color-primary)_16%,transparent)] text-[var(--color-foreground)]",
          "ring-1 ring-[color-mix(in_srgb,var(--color-primary)_22%,var(--color-border))]",
          "hover:bg-[color-mix(in_srgb,var(--color-primary)_22%,transparent)]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
          menuOpen &&
            "ring-2 ring-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))]",
          isImpersonating &&
            "ring-2 ring-[color-mix(in_srgb,var(--color-warning)_50%,var(--color-border))]",
        )}
        onClick={() => setMenuOpen((value) => !value)}
      >
        {initials}
      </button>

      {menuOpen ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-[15.5rem] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_16px_40px_color-mix(in_srgb,var(--color-foreground)_14%,transparent)]"
        >
          <div className="border-b border-[var(--color-border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-primary)_10%,var(--color-card)),var(--color-card)_60%)] px-3.5 py-3">
            <p className="truncate text-[13px] font-semibold text-[var(--color-foreground)]">
              {email ?? "Admin"}
            </p>
            <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-muted)]">
              {isImpersonating ? `Viewing as · ${roleLabel}` : roleLabel || "Signed in"}
            </p>
          </div>

          <div className="p-1.5">
            <a
              href={storeHref}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium text-[var(--color-foreground)] transition hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-surface))]"
              onClick={() => setMenuOpen(false)}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-surface))] text-[var(--color-primary)]">
                <StorefrontOutlinedIcon sx={{ fontSize: 18 }} />
              </span>
              View store
            </a>

            {!isImpersonating ? (
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium text-[var(--color-foreground)] transition hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-surface))]"
                onClick={() => {
                  setMenuOpen(false);
                  setPasswordOpen(true);
                }}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-surface))] text-[var(--color-primary)]">
                  <KeyOutlinedIcon sx={{ fontSize: 18 }} />
                </span>
                Change password
              </button>
            ) : null}

            <div className="mt-0.5 border-t border-[var(--color-border)] pt-0.5">
              {isImpersonating ? (
                <div onClick={() => setMenuOpen(false)}>
                  <AdminImpersonationExitButton />
                </div>
              ) : (
                <LogoutControl
                  redirectTo={loginRedirect}
                  label="Log out"
                  className="!w-full !justify-start !rounded-xl !px-2.5 !py-2 !text-[13px] !font-medium !text-[var(--color-foreground)] hover:!bg-[color-mix(in_srgb,var(--color-foreground)_6%,var(--color-surface))]"
                  icon={
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-surface)] text-[var(--color-muted)] ring-1 ring-[var(--color-border)]">
                      <LogoutRoundedIcon sx={{ fontSize: 18 }} />
                    </span>
                  }
                />
              )}
            </div>
          </div>
        </div>
      ) : null}

      <AdminChangePasswordDialog
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
      />
    </div>
  );
}
