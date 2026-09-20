"use client";

import CloseIcon from "@mui/icons-material/Close";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { HeaderAccountMenu } from "@/components/common/HeaderAccountMenu";
import { isActivePath } from "@/lib/is-active-path";
import { cn } from "@/lib/cn";
import type { BrandConfig, NavigationConfig } from "@/types";

const MENU_MOTION_MS = 380;

/**
 * Full-viewport mobile menu overlay — covers announcement/header so the page
 * underneath does not reflow. Scroll-lock compensates for scrollbar width.
 */
export function MobileNavOverlay({
  open,
  onClose,
  brand,
  logoSrc,
  navigation,
  pathname,
  showAccount,
}: {
  open: boolean;
  onClose: () => void;
  brand: BrandConfig;
  logoSrc: string | null | undefined;
  navigation: NavigationConfig;
  pathname: string;
  showAccount: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setRendered(true);
      const id = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setEntered(true));
      });
      return () => window.cancelAnimationFrame(id);
    }

    setEntered(false);
    if (!rendered) return;
    const timeout = window.setTimeout(() => setRendered(false), MENU_MOTION_MS);
    return () => window.clearTimeout(timeout);
  }, [open, rendered]);

  useEffect(() => {
    if (!rendered) return;

    const scrollbarGap =
      window.innerWidth - document.documentElement.clientWidth;
    const { body } = document;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;

    body.style.overflow = "hidden";
    if (scrollbarGap > 0) {
      body.style.paddingRight = `${scrollbarGap}px`;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
      window.removeEventListener("keydown", onKey);
    };
  }, [rendered, onClose]);

  if (!mounted || !rendered) return null;

  return createPortal(
    <div
      className={cn(
        "sf-mobile-menu fixed inset-0 z-[200] lg:hidden",
        entered && "sf-mobile-menu--open",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
    >
      <div className="sf-mobile-menu__sheet absolute inset-0 flex flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] px-5 py-3.5">
          <Link
            href="/"
            onClick={onClose}
            className="flex min-w-0 items-center gap-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt={brand.logoAlt ?? brand.name}
                className="h-9 w-auto max-w-[9rem] object-contain object-left"
              />
            ) : (
              <span className="truncate font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--color-foreground)]">
                {brand.name}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--color-foreground)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-foreground)_6%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            <CloseIcon fontSize="small" />
          </button>
        </div>

        <nav
          id="mobile-nav"
          className="flex min-h-0 flex-1 flex-col"
          aria-label="Mobile"
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-7">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-[var(--color-muted)]">
              Menu
            </p>
            <ul className="mt-5">
              {navigation.primary.map((item, index) => {
                const active = isActivePath(pathname, item.href);
                const isLast = index === navigation.primary.length - 1;
                return (
                  <li key={`${item.href}-${item.label}`}>
                    <Link
                      href={item.href}
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noopener noreferrer" : undefined}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "block py-3 font-[family-name:var(--font-display)] text-base font-medium leading-snug tracking-tight transition-colors",
                        !isLast &&
                          "border-b border-[color-mix(in_srgb,var(--color-border)_70%,transparent)]",
                        active
                          ? "text-[var(--color-primary)]"
                          : "text-[var(--color-foreground)] hover:text-[var(--color-primary)]",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {showAccount ? (
            <div className="shrink-0 border-t border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-card)_92%,var(--color-background))] px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-[var(--color-muted)]">
                Account
              </p>
              <div className="mt-4 flex flex-col items-stretch gap-3 [&_>div]:w-full [&_>div]:flex-col [&_>div]:items-stretch [&_a]:w-full [&_a]:justify-center [&_a]:text-center [&_a]:py-2.5">
                <HeaderAccountMenu />
              </div>
            </div>
          ) : null}
        </nav>
      </div>
    </div>,
    document.body,
  );
}
