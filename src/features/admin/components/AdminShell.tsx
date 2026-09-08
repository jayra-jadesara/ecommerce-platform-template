"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import IconButton from "@mui/material/IconButton";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { getAdminPath } from "@/config/admin-route";
import { cn } from "@/lib/cn";
import type {
  AdminNavEntry,
  AdminNavIcon,
  AdminNavItem,
} from "@/features/admin/nav";

export type { AdminNavItem };

const ICONS: Record<
  AdminNavIcon,
  React.ComponentType<{ className?: string; fontSize?: "small" | "inherit" }>
> = {
  dashboard: DashboardOutlinedIcon,
  products: Inventory2OutlinedIcon,
  orders: ReceiptLongOutlinedIcon,
  customers: PeopleOutlinedIcon,
  content: ArticleOutlinedIcon,
  settings: SettingsOutlinedIcon,
};

function isActivePath(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href.endsWith("/catalog/products")) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (href.endsWith("/settings")) {
    return false;
  }
  return pathname.startsWith(`${href}/`);
}

function groupHasActive(pathname: string, children: { href: string }[]) {
  return children.some((child) => isActivePath(pathname, child.href));
}

function NavIcon({ name }: { name?: AdminNavIcon }) {
  if (!name) return null;
  const Icon = ICONS[name];
  return <Icon className="shrink-0" fontSize="small" />;
}

function formatRole(role: string) {
  return role
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function pageTitleFromPath(pathname: string, tree: AdminNavEntry[]): string {
  for (const entry of tree) {
    if (entry.kind === "link" && isActivePath(pathname, entry.href)) {
      return entry.label;
    }
    if (entry.kind === "group") {
      for (const child of entry.children) {
        if (isActivePath(pathname, child.href)) return child.label;
      }
      if (groupHasActive(pathname, entry.children)) return entry.label;
    }
  }
  return "Admin";
}

const chromeBg =
  "bg-[color-mix(in_srgb,var(--color-surface)_88%,var(--color-primary)_12%)]";
const sidebarBg =
  "bg-[color-mix(in_srgb,var(--color-surface)_82%,var(--color-secondary)_18%)]";

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
  navItems: AdminNavEntry[] | AdminNavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const loginRedirect = getAdminPath("/login");

  const tree = useMemo((): AdminNavEntry[] => {
    if (!navItems.length) return [];
    if ("kind" in navItems[0]!) {
      return navItems as AdminNavEntry[];
    }
    return (navItems as AdminNavItem[]).map((item) => ({
      kind: "link" as const,
      id: item.href,
      label: item.label,
      href: item.href,
      permissions: [item.permission],
    }));
  }, [navItems]);

  const title = pageTitleFromPath(pathname, tree);
  const roleLabel = roles.map(formatRole).join(" · ");
  const initials = (email ?? "A")
    .split("@")[0]!
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(false));
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function isGroupOpen(id: string, children: { href: string }[]) {
    if (groupHasActive(pathname, children)) return true;
    return Boolean(expanded[id]);
  }

  const navLinkClass = (active: boolean) =>
    cn(
      "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
      active
        ? "bg-[color-mix(in_srgb,var(--color-primary)_22%,transparent)] text-[var(--color-foreground)] before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-[var(--color-primary)]"
        : "text-[var(--color-muted)] hover:bg-[color-mix(in_srgb,var(--color-foreground)_7%,transparent)] hover:text-[var(--color-foreground)]",
    );

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--color-background)] text-[var(--color-foreground)]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-dvh w-[min(18rem,88vw)] flex-col border-r border-[var(--color-border)] transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-60 lg:translate-x-0 xl:w-64",
          sidebarBg,
          open ? "translate-x-0 shadow-xl" : "-translate-x-full lg:translate-x-0 lg:shadow-none",
        )}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center gap-2 border-b border-[var(--color-border)] px-4",
            chromeBg,
          )}
        >
          <Link
            href={getAdminPath("/dashboard")}
            className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight"
            onClick={() => setOpen(false)}
          >
            {brandName}
          </Link>
          <IconButton
            className="lg:!hidden"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            size="small"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>

        <nav
          className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 py-3"
          aria-label="Admin"
        >
          {tree.map((entry) => {
            if (entry.kind === "link") {
              const active = isActivePath(pathname, entry.href);
              return (
                <Link
                  key={entry.id}
                  href={entry.href}
                  onClick={() => setOpen(false)}
                  className={navLinkClass(active)}
                >
                  <NavIcon name={entry.icon} />
                  <span className="truncate">{entry.label}</span>
                </Link>
              );
            }

            const openGroup = isGroupOpen(entry.id, entry.children);
            const groupActive = groupHasActive(pathname, entry.children);
            return (
              <div key={entry.id} className="space-y-1">
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors",
                    groupActive
                      ? "text-[var(--color-foreground)]"
                      : "text-[var(--color-muted)] hover:bg-[color-mix(in_srgb,var(--color-foreground)_7%,transparent)] hover:text-[var(--color-foreground)]",
                  )}
                  aria-expanded={openGroup}
                  onClick={() =>
                    setExpanded((prev) => ({
                      ...prev,
                      [entry.id]: !openGroup,
                    }))
                  }
                >
                  <NavIcon name={entry.icon} />
                  <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                  <ExpandMoreIcon
                    fontSize="small"
                    className={cn(
                      "shrink-0 opacity-60 transition-transform",
                      openGroup ? "rotate-180" : "",
                    )}
                  />
                </button>
                {openGroup ? (
                  <div className="ml-4 space-y-0.5 border-l border-[var(--color-border)] pl-2">
                    {entry.children.map((child) => {
                      const active = isActivePath(pathname, child.href);
                      return (
                        <Link
                          key={child.id}
                          href={child.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "block rounded-md px-3 py-2 text-sm transition-colors",
                            active
                              ? "bg-[color-mix(in_srgb,var(--color-primary)_22%,transparent)] font-medium text-[var(--color-foreground)]"
                              : "text-[var(--color-muted)] hover:bg-[color-mix(in_srgb,var(--color-foreground)_7%,transparent)] hover:text-[var(--color-foreground)]",
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-2 border-t border-[var(--color-border)] p-3">
          <div className="flex items-center gap-2.5 rounded-md bg-[color-mix(in_srgb,var(--color-foreground)_5%,transparent)] px-2.5 py-2">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_22%,transparent)] text-xs font-semibold"
              aria-hidden
            >
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{email ?? "Admin"}</p>
              {roleLabel ? (
                <p className="truncate text-[11px] text-[var(--color-muted)]">
                  {roleLabel}
                </p>
              ) : null}
            </div>
          </div>
          <LogoutButton
            redirectTo={loginRedirect}
            variant="outlined"
            label="Log out"
          />
        </div>
      </aside>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[1px] lg:hidden"
          aria-label="Close navigation overlay"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className={cn(
            "z-20 flex h-14 shrink-0 items-center gap-3 border-b border-[var(--color-border)] px-3 sm:px-4 lg:px-6",
            chromeBg,
          )}
        >
          <IconButton
            className="lg:!hidden"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            size="small"
          >
            <MenuIcon fontSize="small" />
          </IconButton>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold sm:text-base">
              {title}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle />
          </div>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-[var(--color-background)]">
          <div className="w-full min-w-0 px-2 py-2 sm:px-3 sm:py-3">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
