"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import IconButton from "@mui/material/IconButton";
import { Container } from "@/components/layout/Container";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { HeaderAuthLinks } from "@/components/common/HeaderAuthLinks";
import { HeaderCartControl } from "@/features/cart/components/HeaderCartControl";
import { useThemeMode } from "@/features/theme";
import { cn } from "@/lib/cn";
import { useHasHydrated } from "@/lib/use-has-hydrated";
import type {
  BrandConfig,
  HeaderChromeConfig,
  LayoutConfig,
  NavigationConfig,
} from "@/types";

const LOGO_HEIGHT: Record<HeaderChromeConfig["logoSize"], string> = {
  small: "h-9 md:h-10",
  medium: "h-11 md:h-12",
  large: "h-12 md:h-14",
};

interface HeaderProps {
  brand: BrandConfig;
  navigation: NavigationConfig;
  layout: LayoutConfig;
  header: HeaderChromeConfig;
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isMeaningfulTagline(tagline: string | undefined | null) {
  const t = tagline?.trim();
  if (!t) return false;
  if (t.toLowerCase() === "your store, your brand.") return false;
  return true;
}

function NavLinks({
  items,
  pathname,
  variant,
  onNavigate,
}: {
  items: NavigationConfig["primary"];
  pathname: string;
  variant: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  return (
    <>
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noopener noreferrer" : undefined}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              variant === "desktop"
                ? "relative px-1 py-1 text-[0.9375rem] font-medium tracking-wide transition-colors"
                : "rounded-lg px-3 py-3 text-base font-medium transition-colors",
              active
                ? "text-[var(--color-primary)]"
                : "text-[var(--color-header-foreground)] hover:text-[var(--color-primary)]",
              variant === "mobile" &&
                (active
                  ? "bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]"
                  : "hover:bg-[var(--color-surface)]"),
              variant === "desktop" &&
                active &&
                "after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-[var(--color-primary)]",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

/**
 * Commerce header — logo + tagline left, centered nav, icon utilities right
 * (inspired by premium Indian FMCG storefront patterns; fully white-label).
 */
export function Header({ brand, navigation, layout, header }: HeaderProps) {
  const pathname = usePathname() || "/";
  const hydrated = useHasHydrated();
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchPath, setSearchPath] = useState(pathname);
  const [scrolled, setScrolled] = useState(false);
  const { resolvedMode } = useThemeMode();
  const open = menuPath === pathname;

  // Close search when the route changes (React-recommended props→state adjust).
  if (searchPath !== pathname) {
    setSearchPath(pathname);
    if (searchOpen) setSearchOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    const id = window.requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const logoSrc =
    hydrated && resolvedMode === "dark" && brand.logoDarkUrl
      ? brand.logoDarkUrl
      : brand.logoUrl;

  const sticky = header.sticky ?? layout.stickyHeader;
  const showNav = header.navVisible;
  const showMobileMenu = header.mobileMenuEnabled;
  const showAccount = header.accountEnabled;
  const showCart = header.cartEnabled;
  const showSearch = header.searchEnabled;
  const showTagline = isMeaningfulTagline(brand.tagline);

  return (
    <header
      className={cn(
        "relative isolate z-50 border-b border-[var(--color-border)] bg-[var(--color-header-background)] text-[var(--color-header-foreground)]",
        sticky && "sticky top-0",
        scrolled &&
          "shadow-[0_8px_24px_color-mix(in_srgb,var(--color-foreground)_6%,transparent)]",
      )}
    >
      <Container className="flex min-h-[4.25rem] items-center gap-4 py-2 md:min-h-[5rem] md:gap-6">
        <Link
          href="/"
          className="relative z-10 flex min-w-0 shrink-0 flex-col items-start gap-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt={brand.logoAlt ?? brand.name}
              className={cn("w-auto object-contain", LOGO_HEIGHT[header.logoSize])}
            />
          ) : (
            <span className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
              {brand.name}
            </span>
          )}
          {showTagline ? (
            <span className="max-w-[11rem] truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--color-header-foreground)_62%,transparent)] sm:max-w-[14rem]">
              {brand.tagline}
            </span>
          ) : null}
        </Link>

        {showNav ? (
          <nav
            className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-7 lg:flex xl:gap-9"
            aria-label="Primary"
          >
            <NavLinks
              items={navigation.primary}
              pathname={pathname}
              variant="desktop"
            />
          </nav>
        ) : null}

        <div className="relative z-10 ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          {showSearch ? (
            <>
              <IconButton
                aria-label={searchOpen ? "Close search" : "Search products"}
                aria-expanded={searchOpen}
                size="medium"
                className="!text-[var(--color-header-foreground)]"
                onClick={() => setSearchOpen((v) => !v)}
              >
                <SearchIcon fontSize="small" />
              </IconButton>
              {searchOpen ? (
                <form
                  action="/products"
                  method="get"
                  role="search"
                  className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-[min(20rem,calc(100vw-2rem))] rounded-[var(--radius-default,0.75rem)] border border-[var(--color-border)] bg-[var(--color-card)] p-2 shadow-[0_16px_40px_color-mix(in_srgb,var(--color-foreground)_12%,transparent)] md:w-80"
                >
                  <label className="sr-only" htmlFor="header-product-search">
                    Search products
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="header-product-search"
                      name="q"
                      type="search"
                      autoFocus
                      placeholder="Search products"
                      className="min-h-10 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-sm text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                    />
                    <button
                      type="submit"
                      className="inline-flex min-h-10 items-center rounded-md bg-[var(--color-primary)] px-3 text-sm font-semibold text-[var(--color-button-foreground)]"
                    >
                      Go
                    </button>
                  </div>
                </form>
              ) : null}
            </>
          ) : null}

          {showAccount ? (
            <IconButton
              component={Link}
              href="/account"
              aria-label="Account"
              size="medium"
              className="!hidden !text-[var(--color-header-foreground)] sm:!inline-flex"
            >
              <PersonOutlinedIcon fontSize="small" />
            </IconButton>
          ) : null}

          {showAccount ? (
            <IconButton
              component={Link}
              href="/account/wishlist"
              aria-label="Wishlist"
              size="medium"
              className="!hidden !text-[var(--color-header-foreground)] sm:!inline-flex"
            >
              <FavoriteBorderIcon fontSize="small" />
            </IconButton>
          ) : null}

          {showCart ? <HeaderCartControl /> : null}

          {showAccount ? (
            <div className="hidden lg:block">
              <HeaderAuthLinks compact />
            </div>
          ) : null}

          <ThemeToggle />

          {showMobileMenu && showNav ? (
            <IconButton
              className="lg:!hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() =>
                setMenuPath((current) => (current === pathname ? null : pathname))
              }
              size="medium"
            >
              {open ? <CloseIcon /> : <MenuIcon />}
            </IconButton>
          ) : null}
        </div>
      </Container>

      {open && showMobileMenu && showNav ? (
        <nav
          id="mobile-nav"
          className="border-t border-[var(--color-border)] bg-[var(--color-header-background)] lg:hidden"
          aria-label="Mobile"
        >
          <Container className="flex flex-col gap-1 py-3">
            <NavLinks
              items={navigation.primary}
              pathname={pathname}
              variant="mobile"
              onNavigate={() => setMenuPath(null)}
            />
            {showAccount ? (
              <div className="border-t border-[var(--color-border)] px-1 pt-2">
                <HeaderAuthLinks />
              </div>
            ) : null}
          </Container>
        </nav>
      ) : null}
    </header>
  );
}
