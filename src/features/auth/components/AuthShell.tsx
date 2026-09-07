"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/common/ThemeToggle";
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

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--color-background)] text-[var(--color-foreground)]">
      <header className="flex items-center justify-between bg-[var(--color-header-background)] px-4 py-4 text-[var(--color-header-foreground)] md:px-8">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight"
        >
          {brand.name}
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm md:p-8">
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
