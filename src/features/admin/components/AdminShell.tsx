"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SearchIcon from "@mui/icons-material/Search";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import WarehouseOutlinedIcon from "@mui/icons-material/WarehouseOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import StraightenOutlinedIcon from "@mui/icons-material/StraightenOutlined";
import StarBorderOutlinedIcon from "@mui/icons-material/StarBorderOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ViewCarouselOutlinedIcon from "@mui/icons-material/ViewCarouselOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import IconButton from "@mui/material/IconButton";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { AdminUserMenu } from "@/features/admin/components/AdminUserMenu";
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
  getAdminSearchableLinks,
  getAdminSidebarLinks,
  type AdminNavEntry,
  type AdminNavIcon,
  type AdminNavItem,
  type AdminNavLink,
  type AdminNavSection,
} from "@/features/admin/nav";
import { AdminDatePickersProvider } from "@/features/admin/ui/AdminDatePickersProvider";

export type { AdminNavItem };

const ICONS: Record<
  AdminNavIcon,
  ComponentType<{ className?: string; fontSize?: "small" | "inherit" }>
> = {
  dashboard: DashboardOutlinedIcon,
  categories: CategoryOutlinedIcon,
  sizes: StraightenOutlinedIcon,
  reviews: StarBorderOutlinedIcon,
  products: Inventory2OutlinedIcon,
  inventory: WarehouseOutlinedIcon,
  orders: ShoppingBagOutlinedIcon,
  errors: ReportProblemOutlinedIcon,
  reports: AssessmentOutlinedIcon,
  customers: PeopleOutlinedIcon,
  content: ArticleOutlinedIcon,
  homepage: HomeOutlinedIcon,
  about: InfoOutlinedIcon,
  career: WorkOutlineOutlinedIcon,
  legal: GavelOutlinedIcon,
  pages: DescriptionOutlinedIcon,
  banners: ViewCarouselOutlinedIcon,
  blog: MenuBookOutlinedIcon,
  media: PhotoLibraryOutlinedIcon,
  team: ManageAccountsOutlinedIcon,
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
  "products-inventory": "Inventory",
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

function NavIcon({
  name,
  active = false,
}: {
  name?: AdminNavIcon;
  active?: boolean;
}) {
  if (!name) return null;
  const Icon = ICONS[name];
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors",
        active
          ? "border-[color-mix(in_srgb,var(--color-primary)_28%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] text-[var(--color-primary)]"
          : "border-transparent bg-[color-mix(in_srgb,var(--color-foreground)_5%,transparent)] text-[var(--color-foreground)]/75",
      )}
    >
      <Icon className="!text-[1.05rem]" fontSize="small" />
    </span>
  );
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

function linkLabel(link: AdminNavLink) {
  return SIDEBAR_LABEL[link.id] ?? link.label;
}

type SearchLink = AdminNavLink & { section: AdminNavSection };

function AdminNavSearch({ links }: { links: SearchLink[] }) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = !q
      ? links
      : links.filter((link) => {
          const label = linkLabel(link).toLowerCase();
          const section = ADMIN_NAV_SECTION_LABELS[link.section].toLowerCase();
          const id = link.id.toLowerCase().replace(/-/g, " ");
          return (
            label.includes(q) || section.includes(q) || id.includes(q)
          );
        });

    const bySection = new Map<AdminNavSection, SearchLink[]>();
    for (const section of SECTION_ORDER) bySection.set(section, []);
    for (const link of matched) {
      bySection.get(link.section)?.push(link);
    }

    return SECTION_ORDER.map((section) => ({
      section,
      label: ADMIN_NAV_SECTION_LABELS[section],
      links: bySection.get(section) ?? [],
    })).filter((group) => group.links.length > 0);
  }, [links, query]);

  const flatResults = useMemo(
    () => results.flatMap((group) => group.links),
    [results],
  );

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    optionRefs.current[highlight]?.scrollIntoView({
      block: "nearest",
    });
  }, [highlight, open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function goTo(href: string) {
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
    router.push(href);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((prev) =>
        flatResults.length ? (prev + 1) % flatResults.length : 0,
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((prev) =>
        flatResults.length
          ? (prev - 1 + flatResults.length) % flatResults.length
          : 0,
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const target = flatResults[highlight];
      if (target) goTo(target.href);
    }
  }

  let optionIndex = -1;
  optionRefs.current = [];

  return (
    <div
      ref={rootRef}
      className="relative mx-auto hidden min-w-0 max-w-md flex-1 md:block"
    >
      <label className="relative block">
        <span className="sr-only">Search navigation</span>
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 !text-[1.1rem] -translate-y-1/2 text-[var(--color-muted)]" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && flatResults[highlight]
              ? `${listId}-opt-${flatResults[highlight]!.id}`
              : undefined
          }
          value={query}
          placeholder="Search navigation…"
          autoComplete="off"
          className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] pl-10 pr-9 text-sm text-[var(--color-foreground)] shadow-[0_1px_0_color-mix(in_srgb,var(--color-foreground)_4%,transparent)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_22%,transparent)] [&::-webkit-search-cancel-button]:hidden"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {query ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-[var(--color-muted)] hover:bg-[color-mix(in_srgb,var(--color-foreground)_6%,transparent)] hover:text-[var(--color-foreground)]"
            aria-label="Clear search"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setQuery("");
              setOpen(true);
              inputRef.current?.focus();
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </button>
        ) : null}
      </label>

      {open ? (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_20px_48px_color-mix(in_srgb,var(--color-foreground)_18%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--color-foreground)_4%,transparent)]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_85%,var(--color-card))] px-3 py-2">
            <p className="text-[11px] font-medium text-[var(--color-muted)]">
              {query.trim()
                ? `${flatResults.length} match${flatResults.length === 1 ? "" : "es"}`
                : "Jump to a page"}
            </p>
            <p className="hidden items-center gap-1 text-[10px] text-[var(--color-muted)] sm:flex">
              <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-card)] px-1 py-px font-sans">
                ↑↓
              </kbd>
              <span>move</span>
              <span className="mx-0.5 text-[var(--color-border)]">·</span>
              <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-card)] px-1 py-px font-sans">
                Enter
              </kbd>
              <span>open</span>
            </p>
          </div>

          <div className="max-h-[min(22rem,60vh)] overflow-y-auto py-1.5">
            {flatResults.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <p className="text-sm font-medium text-[var(--color-foreground)]">
                  No pages found
                </p>
                <p className="mt-1 text-[12px] text-[var(--color-muted)]">
                  Try another name — sidebar stays the same.
                </p>
              </div>
            ) : (
              results.map((group) => (
                <div key={group.section} className="px-1.5 py-1">
                  <p className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-muted)]">
                    {group.label}
                  </p>
                  <ul className="space-y-0.5">
                    {group.links.map((link) => {
                      optionIndex += 1;
                      const index = optionIndex;
                      const active = index === highlight;
                      const Icon = link.icon ? ICONS[link.icon] : null;
                      return (
                        <li
                          key={link.id}
                          role="option"
                          id={`${listId}-opt-${link.id}`}
                          aria-selected={active}
                        >
                          <button
                            type="button"
                            ref={(node) => {
                              optionRefs.current[index] = node;
                            }}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors",
                              active
                                ? "bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] text-[var(--color-foreground)]"
                                : "text-[var(--color-foreground)] hover:bg-[color-mix(in_srgb,var(--color-foreground)_5%,transparent)]",
                            )}
                            onMouseEnter={() => setHighlight(index)}
                            onClick={() => goTo(link.href)}
                          >
                            <span
                              className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                                active
                                  ? "border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-card))] text-[var(--color-primary)]"
                                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]",
                              )}
                            >
                              {Icon ? (
                                <Icon
                                  className="!text-[1.05rem]"
                                  fontSize="small"
                                />
                              ) : (
                                <SearchIcon
                                  className="!text-[1.05rem]"
                                  fontSize="small"
                                />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-semibold leading-tight">
                                {linkLabel(link)}
                              </span>
                              <span className="block truncate text-[11px] leading-snug text-[var(--color-muted)]">
                                {group.label}
                              </span>
                            </span>
                            {active ? (
                              <span className="hidden shrink-0 text-[10px] font-medium text-[var(--color-muted)] sm:inline">
                                Open ↵
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
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
  siteUrl?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
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
  const searchLinks = useMemo(() => getAdminSearchableLinks(tree), [tree]);

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
      "relative flex items-center gap-2.5 rounded-xl px-2.5 py-[7px] text-[13px] font-medium transition-colors",
      active
        ? "bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-card))] font-semibold text-[var(--color-foreground)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-primary)_14%,transparent)] before:absolute before:inset-y-1.5 before:left-0 before:w-[2.5px] before:rounded-full before:bg-[var(--color-primary)]"
        : "text-[var(--color-foreground)]/78 hover:bg-[color-mix(in_srgb,var(--color-foreground)_3.5%,transparent)] hover:text-[var(--color-foreground)]",
    );

  const sidebar = (
    <>
      <div className="admin-sidebar-brand flex h-14 shrink-0 items-center gap-2 border-b border-[var(--color-border)] px-4">
        <Link
          href={getAdminPath("/dashboard")}
          className="min-w-0 flex-1 truncate text-[17px] font-semibold tracking-tight text-[var(--color-foreground)]"
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
          "flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-3 py-3",
          adminScrollHide(),
        )}
        aria-label="Admin"
      >
        {grouped.map((group) => (
          <div key={group.section} className="mb-1">
            <p className={adminNavSectionLabel()}>{group.label}</p>
            <div className="space-y-1">
              {group.links.map((link) => {
                const active = isActivePath(pathname, link.href);
                const label = SIDEBAR_LABEL[link.id] ?? link.label;
                return (
                  <Link
                    key={link.id}
                    href={link.href}
                    className={navLinkClass(active)}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                  >
                    <NavIcon name={link.icon} active={active} />
                    <span className="min-w-0 flex-1 truncate leading-snug">
                      {label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="relative z-[1] shrink-0 border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-card)_88%,transparent)] px-3 py-3 backdrop-blur-[6px]">
        <div className="flex items-center gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-2 shadow-[0_2px_8px_color-mix(in_srgb,var(--color-foreground)_5%,transparent)]">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] text-[11px] font-semibold tracking-wide text-[var(--color-foreground)]"
            aria-hidden
          >
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold leading-tight text-[var(--color-foreground)]">
              {email ?? "Admin"}
            </p>
            <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--color-muted)]">
              {roleLabel || "Signed in"}
            </p>
          </div>
          <LogoutControl
            redirectTo={loginRedirect}
            iconOnly
            label="Log out"
          />
        </div>
      </div>
    </>
  );

  return (
    <AdminDatePickersProvider>
      <div
        className={cn(
          "admin-shell flex h-dvh max-h-dvh overflow-hidden",
          adminAppBg(),
        )}
      >
        <aside
          data-admin-sidebar
          className={cn(
            "admin-sidebar relative fixed inset-y-0 left-0 z-40 flex h-dvh max-h-dvh w-[min(17.25rem,90vw)] flex-col overflow-hidden border-r border-[var(--color-border)] transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-[var(--admin-sidebar-width)] lg:translate-x-0",
            adminSidebarBg(),
            open
              ? "translate-x-0 shadow-xl"
              : "-translate-x-full lg:translate-x-0 lg:shadow-none",
          )}
        >
          {/* Decorative “A” — charcoal watermark, matches card chrome */}
          <div className="admin-sidebar-motif" aria-hidden>
            <div className="admin-sidebar-motif__shade" />
            <div className="admin-sidebar-motif__triangle" />
            <div className="admin-sidebar-motif__bar" />
          </div>
          <div className="relative z-[1] flex h-full min-h-0 flex-col">
            {sidebar}
          </div>
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

            <AdminNavSearch links={searchLinks} />

            <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
              <a
                href={storeHref}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  adminBtn("outline"),
                  "hidden !min-h-9 !px-3 sm:inline-flex",
                )}
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
              <AdminUserMenu
                email={email}
                roleLabel={roleLabel}
                initials={initials}
                loginRedirect={loginRedirect}
              />
            </div>
          </header>

          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-clip">
            <div className="admin-page-content w-full min-w-0 px-3 py-4 sm:px-5 sm:py-5 lg:px-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminDatePickersProvider>
  );
}
