"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";

export type AdminSettingsTab = {
  id: string;
  label: string;
  href: string;
};

type AdminSettingsTabsProps = {
  tabs: AdminSettingsTab[];
  activeId: string;
  className?: string;
};

/** Compact segmented tabs for combined settings pages. */
export function AdminSettingsTabs({
  tabs,
  activeId,
  className,
}: AdminSettingsTabsProps) {
  return (
    <div
      className={cn(
        "flex gap-1 rounded-xl bg-[var(--color-surface)] p-1 ring-1 ring-[var(--color-border)]",
        className,
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            role="tab"
            aria-selected={active}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-center text-[12px] font-semibold transition",
              active
                ? "bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm"
                : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
