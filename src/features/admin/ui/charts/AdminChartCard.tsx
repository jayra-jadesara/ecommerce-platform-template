"use client";

import type { ReactNode } from "react";
import { adminCard } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";

export function AdminChartCard({
  title,
  tip,
  children,
  className,
  empty,
}: {
  title: string;
  tip?: string;
  children?: ReactNode;
  className?: string;
  /** When set, shows empty state instead of children. */
  empty?: string | null;
}) {
  return (
    <section className={cn(adminCard(), "p-3.5", className)}>
      <div className="mb-2">
        <h2 className="text-[13px] font-semibold text-[var(--color-foreground)]">
          {title}
        </h2>
        {tip ? (
          <p className="text-[11px] leading-snug text-[var(--color-muted)]">
            {tip}
          </p>
        ) : null}
      </div>
      {empty ? (
        <div className="flex h-[180px] items-center justify-center text-center text-[12px] text-[var(--color-muted)]">
          {empty}
        </div>
      ) : (
        children
      )}
    </section>
  );
}
