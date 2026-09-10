"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SearchIcon from "@mui/icons-material/Search";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ViewCarouselOutlinedIcon from "@mui/icons-material/ViewCarouselOutlined";
import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import IconButton from "@mui/material/IconButton";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { LogoutControl } from "@/features/auth/components/LogoutControl";
import { getAdminPath } from "@/config/admin-route";
import {
  adminAppBg,
  adminBtn,
  adminNavSectionLabel,
  adminScrollHide,
  adminSidebarBg,
  adminTopBar,
} from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";
import {
  ADMIN_NAV_SECTION_LABELS,
  getAdminSidebarLinks,
  type AdminNavEntry,
  type AdminNavIcon,
  type AdminNavItem,
  type AdminNavSection,
} from "@/features/admin/nav";

export type { AdminNavItem };

const ICONS: Record<
  AdminNavIcon,
  ComponentType<{ className?: string; fontSize?: "small" | "inherit" }>
> = {
  dashboard: DashboardOutlinedIcon,
  products: Inventory2OutlinedIcon,
  categories: CategoryOutlinedIcon,
  orders: ReceiptLongOutlinedIcon,
  customers: PeopleOutlinedIcon,
  content: ArticleOutlinedIcon,
  homepage: HomeOutlinedIcon,
  pages: DescriptionOutlinedIcon,
  banners: ViewCarouselOutlinedIcon,
  media: PhotoLibraryOutlinedIcon,
  settings: SettingsOutlinedIcon,
};

const SECTION_ORDER: AdminNavSection[] = [
  "main",
  "catalog",
  "sales",
  "content",
  "store",
];

/** Sidebar display labels (friendlier than nested tree labels). */
const SIDEBAR_LABEL: Record<string, string> = {
  "products-all": "Products",
  "settings-hub": "Store Settings",
};

function isActivePath(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href.endsWith("/catalog/products")) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (href.endsWith("/settings")) {
    return pathname === href;
  }
  return pathname.startsWith(`${href}/`);
}

function NavIcon({ name }: { name?: AdminNavIcon }) {
  if (!name) return null;
  const Icon = ICONS[name];
  return <Icon className="shrink-0 !text-[1.125rem]" fontSize="small" />;
}

function formatRole(role: string) {
  return role
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function pageTitleFromPath(
  pathname: string,
  links: { href: string; label: string; id: string }[],
): string {
  for (const link of links) {
    if (isActivePath(pathname, link.href)) {
      return SIDEBAR_LABEL[link.id] ?? link.label;
    }
  }
  if (pathname.includes("/settings/")) return "Store Settings";
  if (pathname.includes("/catalog/")) return "Catalog";
  return "Admin";
}

export function AdminShell({
  brandName,
  email,
  roles,
  navItems,
  siteUrl,
  children,
}: {
  brandName: string;
  email: string | null;
  roles: string[];
  navItems: AdminNavEntry[] | AdminNavItem[];
  /** Public storefront origin — opens safely in a new tab. */
  siteUrl?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
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

  const sidebarLinks = useMemo(() => getAdminSidebarLinks(tree), [tree]);

  const grouped = useMemo(() => {
    const map = new Map<AdminNavSection, typeof sidebarLinks>();
    for (const section of SECTION_ORDER) map.set(section, []);
    for (const link of sidebarLinks) {
      const list = map.get(link.section) ?? [];
      list.push(link);
      map.set(link.section, list);
    }
    return SECTION_ORDER.map((section) => ({
      section,
      label: ADMIN_NAV_SECTION_LABELS[section],
      links: map.get(section) ?? [],
    })).filter((group) => group.links.length > 0);
  }, [sidebarLinks]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return grouped;
    return grouped
      .map((group) => ({
        ...group,
        links: group.links.filter((link) => {
          const label = SIDEBAR_LABEL[link.id] ?? link.label;
          return label.toLowerCase().includes(q);
        }),
      }))
      .filter((group) => group.links.length > 0);
  }, [grouped, search]);

  const title = pageTitleFromPath(pathname, sidebarLinks);
  const roleLabel = roles.map(formatRole).join(" · ");
  const initials = (email ?? "A")
    .split("@")[0]!
    .slice(0, 2)
    .toUpperCase();
  const storeHref = siteUrl?.replace(/\/$/, "") || "/";

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

  const navLinkClass = (active: boolean) =>
    cn(
      "relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
      active
        ? "bg-[color-mix(in_srgb,var(--color-primary)_16%,transparent)] font-semibold text-[var(--color-foreground)] before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-[var(--color-primary)]"
        : "text-[var(--color-muted)] hover:bg-[color-mix(in_srgb,var(--color-foreground)_5%,transparent)] hover:text-[var(--color-foreground)]",
    );

  const sidebar = (
    <>
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--color-border)] px-4">
        <Link
          href={getAdminPath("/dashboard")}
          className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]"
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
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-2.5 py-2",
          adminScrollHide(),
        )}
        aria-label="Admin"
      >
        {filteredGroups.map((group) => (
          <div key={group.section}>
            <p className={adminNavSectionLabel()}>{group.label}</p>
            <div className="space-y-0.5">
              {group.links.map((link) => {
                const active = isActivePath(pathname, link.href);
                const label = SIDEBAR_LABEL[link.id] ?? link.label;
                return (
                  <Link
                    key={link.id}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={navLinkClass(active)}
                  >
                    <NavIcon name={link.icon} />
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 space-y-2 border-t border-[var(--color-border)] p-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-[color-mix(in_srgb,var(--color-foreground)_4%,transparent)] px-2.5 py-2">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_18%,transparent)] text-[11px] font-semibold"
            aria-hidden
          >
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium leading-tight">
              {email ?? "Admin"}
            </p>
            {roleLabel ? (
              <p className="truncate text-[10px] leading-tight text-[var(--color-muted)]">
                {roleLabel}
              </p>
            ) : null}
          </div>
        </div>
        <LogoutControl
          redirectTo={loginRedirect}
          variant="outlined"
          label="Log out"
        />
      </div>
    </>
  );

  return (
    <div
      className={cn(
        "admin-shell flex h-dvh max-h-dvh overflow-hidden text-[var(--color-foreground)]",
        adminAppBg(),
      )}
    >
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-dvh max-h-dvh w-[min(17.5rem,88vw)] flex-col border-r border-[var(--color-border)] transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-[var(--admin-sidebar-width)] lg:translate-x-0",
          adminSidebarBg(),
          open
            ? "translate-x-0 shadow-xl"
            : "-translate-x-full lg:translate-x-0 lg:shadow-none",
        )}
      >
        {sidebar}
      </aside>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/45 backdrop-blur-[1px] lg:hidden"
          aria-label="Close navigation overlay"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className={cn(adminTopBar(), "z-20")}>
          <IconButton
            className="lg:!hidden"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            size="small"
          >
            <MenuIcon fontSize="small" />
          </IconButton>

          <div className="min-w-0 shrink-0">
            <p className="hidden truncate text-[11px] font-medium text-[var(--color-muted)] sm:block">
              {brandName}
            </p>
            <p className="truncate text-sm font-semibold leading-tight sm:text-[15px]">
              {title}
            </p>
          </div>

          <label className="relative mx-auto hidden min-w-0 max-w-md flex-1 md:block">
            <span className="sr-only">Search admin</span>
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 !text-[1.1rem] -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search navigation…"
              className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] pl-10 pr-3 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)]"
            />
          </label>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <a
              href={storeHref}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(adminBtn("outline"), "hidden !min-h-9 !px-3 sm:inline-flex")}
            >
              View Store
              <OpenInNewIcon className="!text-[1rem]" fontSize="inherit" />
            </a>
            <a
              href={storeHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] sm:hidden"
              aria-label="View Store"
            >
              <OpenInNewIcon fontSize="small" />
            </a>
            <ThemeToggle />
            <span
              className="hidden h-8 w-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_16%,transparent)] text-[11px] font-semibold sm:inline-flex"
              aria-hidden
            >
              {initials}
            </span>
          </div>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="admin-page-content w-full min-w-0 px-3 py-4 sm:px-5 sm:py-5 lg:px-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
