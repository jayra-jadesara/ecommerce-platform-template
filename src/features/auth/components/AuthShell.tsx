"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { BackLink } from "@/components/layout/BackLink";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useThemeMode } from "@/features/theme";
import { useHasHydrated } from "@/lib/use-has-hydrated";
import { usePlatformConfig } from "@/providers/PlatformConfigProvider";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { brand } = usePlatformConfig();
  const { resolvedMode } = useThemeMode();
  const hydrated = useHasHydrated();

  const logoSrc =
    hydrated && resolvedMode === "dark" && brand.logoDarkUrl
      ? brand.logoDarkUrl
      : brand.logoUrl;

  return (
    <div className="sf-auth-shell flex min-h-full flex-1 flex-col text-[var(--color-foreground)]">
      <div className="sf-auth-doodle" aria-hidden />

      <header className="relative z-10 flex items-center justify-between gap-3 px-4 py-4 md:px-8">
        <BackLink href="/" label="Back" />
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-12 pt-2">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt=""
              className="h-10 w-auto shrink-0 object-contain md:h-11"
            />
          ) : null}
          <span className="sf-auth-brand font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
            {brand.name}
          </span>
        </Link>

        <div className="sf-auth-panel w-full max-w-md rounded-[var(--radius-default,14px)] p-6 md:p-8">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-[var(--color-muted)]">{subtitle}</p>
          ) : null}
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
