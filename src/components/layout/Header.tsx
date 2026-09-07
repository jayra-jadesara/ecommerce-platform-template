"use client";

import Link from "next/link";
import { useState } from "react";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import { Container } from "@/components/layout/Container";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { cn } from "@/lib/cn";
import type { BrandConfig, LayoutConfig, NavigationConfig } from "@/types";

interface HeaderProps {
  brand: BrandConfig;
  navigation: NavigationConfig;
  layout: LayoutConfig;
}

export function Header({ brand, navigation, layout }: HeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header
      className={cn(
        "z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur",
        layout.stickyHeader && "sticky top-0",
      )}
      style={{ minHeight: "var(--layout-header-height)" }}
    >
      <Container className="flex h-[var(--layout-header-height)] items-center justify-between gap-4">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt={brand.logoAlt ?? brand.name}
              className="h-8 w-auto"
            />
          ) : (
            brand.name
          )}
        </Link>

        <nav
          className="hidden items-center gap-6 md:flex"
          aria-label="Primary"
        >
          {navigation.primary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <IconButton
            className="md:!hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
            size="small"
          >
            {open ? <CloseIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
          </IconButton>
        </div>
      </Container>

      {open ? (
        <nav
          id="mobile-nav"
          className="border-t border-[var(--color-border)] bg-[var(--color-surface)] md:hidden"
          aria-label="Mobile"
        >
          <Container className="flex flex-col gap-1 py-3">
            {navigation.primary.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-background)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </Container>
        </nav>
      ) : null}
    </header>
  );
}
