"use client";

import Link from "next/link";
import { useState } from "react";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import { Container } from "@/components/layout/Container";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { HeaderAuthLinks } from "@/components/common/HeaderAuthLinks";
import { useThemeMode } from "@/features/theme";
import { cn } from "@/lib/cn";
import type {
  BrandConfig,
  HeaderChromeConfig,
  LayoutConfig,
  NavigationConfig,
} from "@/types";

const LOGO_HEIGHT: Record<HeaderChromeConfig["logoSize"], string> = {
  small: "h-6",
  medium: "h-8",
  large: "h-10",
};

interface HeaderProps {
  brand: BrandConfig;
  navigation: NavigationConfig;
  layout: LayoutConfig;
  header: HeaderChromeConfig;
}

function NavLinks({
  items,
  className,
  onNavigate,
}: {
  items: NavigationConfig["primary"];
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {items.map((item) => (
        <Link
          key={`${item.href}-${item.label}`}
          href={item.href}
          target={item.external ? "_blank" : undefined}
          rel={item.external ? "noopener noreferrer" : undefined}
          className={className}
          onClick={onNavigate}
        >
          {item.label}
        </Link>
      ))}
    </>
  );
}

export function Header({ brand, navigation, layout, header }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const { resolvedMode } = useThemeMode();

  const logoSrc =
    resolvedMode === "dark" && brand.logoDarkUrl
      ? brand.logoDarkUrl
      : brand.logoUrl;

  const sticky = header.sticky ?? layout.stickyHeader;
  const showNav = header.navVisible;
  const showMobileMenu = header.mobileMenuEnabled;
  const showAccount = header.accountEnabled;

  return (
    <header
      className={cn(
        "z-40 border-b border-[var(--color-border)] bg-[var(--color-header-background)]/95 text-[var(--color-header-foreground)] backdrop-blur",
        sticky && "sticky top-0",
      )}
      style={{ minHeight: "var(--layout-header-height)" }}
    >
      <Container className="flex h-[var(--layout-header-height)] items-center justify-between gap-4">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--color-header-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt={brand.logoAlt ?? brand.name}
              className={cn("w-auto", LOGO_HEIGHT[header.logoSize])}
            />
          ) : (
            brand.name
          )}
        </Link>

        {showNav ? (
          <nav
            className="hidden items-center gap-6 md:flex"
            aria-label="Primary"
          >
            <NavLinks
              items={navigation.primary}
              className="text-sm font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-header-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            />
          </nav>
        ) : null}

        <div className="flex items-center gap-1">
          {showAccount ? <HeaderAuthLinks /> : null}
          <ThemeToggle />
          {showMobileMenu && showNav ? (
            <IconButton
              className="md:!hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((v) => !v)}
              size="small"
            >
              {open ? (
                <CloseIcon fontSize="small" />
              ) : (
                <MenuIcon fontSize="small" />
              )}
            </IconButton>
          ) : null}
        </div>
      </Container>

      {open && showMobileMenu && showNav ? (
        <nav
          id="mobile-nav"
          className="border-t border-[var(--color-border)] bg-[var(--color-header-background)] md:hidden"
          aria-label="Mobile"
        >
          <Container className="flex flex-col gap-1 py-3">
            <NavLinks
              items={navigation.primary}
              className="rounded-md px-3 py-2 text-sm font-medium text-[var(--color-header-foreground)] hover:bg-[var(--color-background)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
              onNavigate={() => setOpen(false)}
            />
          </Container>
        </nav>
      ) : null}
    </header>
  );
}
