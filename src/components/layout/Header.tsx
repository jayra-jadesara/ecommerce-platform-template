"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import IconButton from "@mui/material/IconButton";
import { Container } from "@/components/layout/Container";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { HeaderAccountMenu } from "@/components/common/HeaderAccountMenu";
import { HeaderCartControl } from "@/features/cart/components/HeaderCartControl";
import { MobileNavOverlay } from "@/components/layout/MobileNavOverlay";
import { ProductsCategoryMenuPanel } from "@/components/layout/ProductsCategoryMenuPanel";
import {
  buildCategoryMenuTree,
  isProductsNavHref,
  type CategoryMenuSource,
} from "@/features/catalog/category-menu";
import { useThemeModeOptional } from "@/features/theme";
import { cn } from "@/lib/cn";
import { isActivePath } from "@/lib/is-active-path";
import { useHasHydrated } from "@/lib/use-has-hydrated";
import type {
  BrandConfig,
  HeaderChromeConfig,
  LayoutConfig,
  NavigationConfig,
} from "@/types";
import type { ReactNode } from "react";

const LOGO_HEIGHT: Record<HeaderChromeConfig["logoSize"], string> = {
  small: "h-8",
  medium: "h-9 md:h-10",
  /** Taller than the slim bar so the mark hangs into the hero. */
  large: "h-14 md:h-16",
  xlarge: "h-16 md:h-[4.75rem] lg:h-[5.5rem]",
};

/** Fits inside the slim bar when overlap is off. */
const LOGO_HEIGHT_IN_BAR: Record<HeaderChromeConfig["logoSize"], string> = {
  small: "h-7",
  medium: "h-8",
  large: "h-9",
  xlarge: "h-10",
};

const LOGO_HEIGHT_SCROLLED: Record<HeaderChromeConfig["logoSize"], string> = {
  small: "h-7",
  medium: "h-8",
  large: "h-9",
  xlarge: "h-10",
};

const SCROLL_SHRINK_THRESHOLD_PX = 24;

interface HeaderProps {
  brand: BrandConfig;
  navigation: NavigationConfig;
  layout: LayoutConfig;
  header: HeaderChromeConfig;
  /** Streamed cart badge from layout Suspense (preferred). */
  cartSlot?: ReactNode;
  /** @deprecated Prefer cartSlot — kept for simple fallbacks. */
  initialCartCount?: number;
  categoryMenu?: CategoryMenuSource[];
}

function isMeaningfulTagline(tagline: string | undefined | null) {
  const t = tagline?.trim();
  if (!t) return false;
  if (t.toLowerCase() === "your store, your brand.") return false;
  return true;
}

function linkClassName(
  variant: "desktop" | "mobile",
  active: boolean,
): string {
  return cn(
    variant === "desktop"
      ? "relative px-1 py-0.5 text-sm tracking-wide transition-colors"
      : "rounded-lg px-3 py-3 text-base transition-colors",
    active
      ? "font-semibold text-[var(--color-primary)]"
      : "font-medium text-[var(--color-header-foreground)] hover:text-[var(--color-primary)]",
    variant === "mobile" &&
      (active
        ? "bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]"
        : "hover:bg-[var(--color-surface)]"),
    variant === "desktop" &&
      active &&
      "after:absolute after:inset-x-0 after:-bottom-1.5 after:h-[3px] after:rounded-full after:bg-[var(--color-primary)]",
  );
}

function NavLinks({
  items,
  pathname,
  variant,
  onNavigate,
  categoryMenuEnabled,
  categoryTree,
}: {
  items: NavigationConfig["primary"];
  pathname: string;
  variant: "desktop" | "mobile";
  onNavigate?: () => void;
  categoryMenuEnabled: boolean;
  categoryTree: ReturnType<typeof buildCategoryMenuTree>;
}) {
  return (
    <>
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        const showCategoryMenu =
          categoryMenuEnabled &&
          variant === "desktop" &&
          isProductsNavHref(item.href);

        if (showCategoryMenu) {
          return (
            <div
              key={`${item.href}-${item.label}`}
              className="group relative"
            >
              <Link
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                aria-haspopup="menu"
                className={cn(
                  linkClassName(variant, active),
                  "inline-flex items-center gap-0.5",
                )}
              >
                {item.label}
                <KeyboardArrowDownIcon
                  sx={{ fontSize: 15 }}
                  className="opacity-55 transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180"
                />
              </Link>
              <div
                role="menu"
                className={cn(
                  "invisible absolute left-1/2 top-full z-50 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 pt-2.5",
                  "translate-y-1 opacity-0 transition-[opacity,visibility,transform] duration-200 ease-out",
                  "group-hover:visible group-hover:translate-y-0 group-hover:opacity-100",
                  "group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100",
                )}
              >
                <ProductsCategoryMenuPanel
                  categoryTree={categoryTree}
                  onNavigate={onNavigate}
                  variant="desktop"
                />
              </div>
            </div>
          );
        }

        return (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noopener noreferrer" : undefined}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={linkClassName(variant, active)}
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
export function Header({
  brand,
  navigation,
  layout,
  header,
  cartSlot,
  initialCartCount = 0,
  categoryMenu = [],
}: HeaderProps) {
  const pathname = usePathname() || "/";
  const hydrated = useHasHydrated();
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchPath, setSearchPath] = useState(pathname);
  const [scrolled, setScrolled] = useState(false);
  const theme = useThemeModeOptional();
  const resolvedMode = theme?.resolvedMode ?? "light";
  const open = menuPath === pathname;

  const categoryMenuEnabled = Boolean(header.productsCategoryMenu);
  const categoryTree = useMemo(
    () =>
      categoryMenuEnabled ? buildCategoryMenuTree(categoryMenu) : [],
    [categoryMenu, categoryMenuEnabled],
  );

  // Close search when the route changes (React-recommended props→state adjust).
  if (searchPath !== pathname) {
    setSearchPath(pathname);
    if (searchOpen) setSearchOpen(false);
  }

  useEffect(() => {
    const onScroll = () =>
      setScrolled(window.scrollY > SCROLL_SHRINK_THRESHOLD_PX);
    const id = window.requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const closeMenu = useCallback(() => setMenuPath(null), []);

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
  const logoSize = header.logoSize;
  const logoHang = header.logoHang ?? "none";
  const hangLogo = logoHang !== "none" && !scrolled;
  const logoHeightClass = scrolled
    ? LOGO_HEIGHT_SCROLLED[logoSize]
    : hangLogo
      ? LOGO_HEIGHT[logoSize]
      : LOGO_HEIGHT_IN_BAR[logoSize];
  const textLogoClass = scrolled
    ? "text-base md:text-lg"
    : hangLogo
      ? "text-xl md:text-2xl"
      : "text-lg md:text-xl";
  /** Tagline only when logo stays inside the slim bar. */
  const showTaglineUnderLogo = showTagline && !hangLogo;

  return (
    <>
      <header
        className={cn(
          "sf-header relative z-50 border-b border-[var(--color-border)] bg-[var(--color-header-background)] text-[var(--color-header-foreground)] transition-[box-shadow,border-color] duration-300 ease-out motion-reduce:transition-none",
          sticky && "sticky top-0",
          scrolled && "sf-header--scrolled",
          hangLogo && "sf-header--logo-hang",
          hangLogo && `sf-header--logo-hang-${logoHang}`,
          scrolled &&
            "border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] shadow-[0_6px_18px_color-mix(in_srgb,var(--color-foreground)_5%,transparent)]",
        )}
      >
        <Container
          className={cn(
            "sf-header__bar relative flex items-center gap-3 overflow-visible transition-[height,min-height,padding] duration-300 ease-out motion-reduce:transition-none md:gap-5",
            scrolled
              ? "h-12 min-h-12 py-0"
              : "h-[3.25rem] min-h-[3.25rem] py-0 md:h-14 md:min-h-14",
          )}
        >
          <Link
            href="/"
            className={cn(
              "sf-header-brand relative z-[60] flex shrink-0 flex-col items-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
              hangLogo && "sf-header-brand--hang",
              hangLogo && `sf-header-brand--hang-${logoHang}`,
            )}
          >
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt={brand.logoAlt ?? brand.name}
                className={cn(
                  "sf-header-brand__img w-auto max-w-[min(40vw,11rem)] object-contain object-left transition-[height,max-height,filter] duration-300 ease-out motion-reduce:transition-none md:max-w-[13rem] lg:max-w-[15rem]",
                  logoHeightClass,
                )}
              />
            ) : (
              <span
                className={cn(
                  "font-[family-name:var(--font-display)] font-semibold tracking-tight transition-[font-size] duration-300 ease-out motion-reduce:transition-none",
                  textLogoClass,
                )}
              >
                {brand.name}
              </span>
            )}
            {showTaglineUnderLogo ? (
              <span
                className={cn(
                  "max-w-[10rem] truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--color-header-foreground)_62%,transparent)] sm:max-w-[12rem]",
                  scrolled && "hidden",
                )}
              >
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
                categoryMenuEnabled={categoryMenuEnabled}
                categoryTree={categoryTree}
              />
            </nav>
          ) : null}

          <div className="relative z-10 ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
            {showSearch ? (
              <>
                <IconButton
                  aria-label={searchOpen ? "Close search" : "Search products"}
                  aria-expanded={searchOpen}
                  size="small"
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
              <div className="hidden sm:block">
                <HeaderAccountMenu />
              </div>
            ) : null}

            {showAccount ? (
              <IconButton
                component={Link}
                href="/account/wishlist"
                aria-label="Wishlist"
                aria-current={
                  isActivePath(pathname, "/account/wishlist")
                    ? "page"
                    : undefined
                }
                size="small"
                className={cn(
                  "!hidden sm:!inline-flex",
                  isActivePath(pathname, "/account/wishlist")
                    ? "!text-[var(--color-primary)] !bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]"
                    : "!text-[var(--color-header-foreground)]",
                )}
              >
                <FavoriteBorderIcon fontSize="small" />
              </IconButton>
            ) : null}

            {showCart
              ? (cartSlot ?? (
                  <HeaderCartControl initialCartCount={initialCartCount} />
                ))
              : null}

            <ThemeToggle />

            {showMobileMenu && showNav ? (
              <IconButton
                className="lg:!hidden"
                aria-label="Open menu"
                aria-expanded={open}
                aria-controls="mobile-nav"
                onClick={() => setMenuPath(pathname)}
                size="small"
              >
                <MenuIcon />
              </IconButton>
            ) : null}
          </div>
        </Container>
      </header>

      {showMobileMenu && showNav ? (
        <MobileNavOverlay
          open={open}
          onClose={closeMenu}
          brand={brand}
          logoSrc={logoSrc}
          navigation={navigation}
          pathname={pathname}
          showAccount={showAccount}
          categoryMenuEnabled={categoryMenuEnabled}
          categoryMenu={categoryMenu}
        />
      ) : null}
    </>
  );
}
