"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { getAdminPath } from "@/config/admin-route";
import { cn } from "@/lib/cn";
import type { Permission } from "@/features/auth/permissions";

export type AdminNavItem = {
  label: string;
  href: string;
  permission: Permission;
};

export function AdminShell({
  brandName,
  email,
  roles,
  navItems,
  children,
}: {
  brandName: string;
  email: string | null;
  roles: string[];
  navItems: AdminNavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const loginRedirect = getAdminPath("/login");

  return (
    <div className="flex min-h-full bg-[var(--color-background)] text-[var(--color-foreground)]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-4">
          <Link
            href={getAdminPath("/dashboard")}
            className="font-[family-name:var(--font-display)] text-sm font-semibold"
          >
            {brandName} Admin
          </Link>
          <IconButton
            className="md:!hidden"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            size="small"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>
        <nav className="flex flex-col gap-1 p-3" aria-label="Admin">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium",
                  active
                    ? "bg-[var(--color-background)] text-[var(--color-foreground)]"
                    : "text-[var(--color-muted)] hover:bg-[var(--color-background)] hover:text-[var(--color-foreground)]",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          aria-label="Close navigation overlay"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4">
          <div className="flex items-center gap-2">
            <IconButton
              className="md:!hidden"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              size="small"
            >
              <MenuIcon fontSize="small" />
            </IconButton>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{email ?? "Admin"}</p>
              <p className="truncate text-xs text-[var(--color-muted)]">
                {roles.join(", ")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LogoutButton redirectTo={loginRedirect} />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
