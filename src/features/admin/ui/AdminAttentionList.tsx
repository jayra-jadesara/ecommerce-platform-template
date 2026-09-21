import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { AdminCard } from "@/features/admin/ui/AdminCard";
import { AdminStatusBadge } from "@/features/admin/ui/AdminStatusBadge";
import {
  adminSectionDesc,
  adminSectionTitle,
} from "@/features/admin/ui/admin-classes";

export type AdminAttentionTone = "info" | "warning" | "error" | "success";

export type AdminAttentionItem = {
  id: string;
  title: string;
  description: string;
  count: number;
  href: string;
  tone?: AdminAttentionTone;
  icon?: ReactNode;
};

const TONE_BADGE: Record<
  AdminAttentionTone,
  "info" | "warning" | "error" | "success"
> = {
  info: "info",
  warning: "warning",
  error: "error",
  success: "success",
};

const TONE_ICON: Record<AdminAttentionTone, string> = {
  info: "bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]",
  warning:
    "bg-[color-mix(in_srgb,var(--color-warning)_16%,transparent)] text-[color-mix(in_srgb,var(--color-warning)_88%,var(--color-foreground))]",
  error:
    "bg-[color-mix(in_srgb,var(--color-error)_14%,transparent)] text-[var(--color-error)]",
  success:
    "bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] text-[var(--color-success)]",
};

/**
 * Daily-ops work queue — only actionable items with real counts.
 * Reusable across admin overview surfaces.
 */
export function AdminAttentionList({
  title = "Needs attention",
  description = "Start here — these items usually unblock customers today.",
  items,
  emptyTitle = "You're all caught up",
  emptyDescription = "No open tasks right now. Check back after the next orders come in.",
  className,
}: {
  title?: string;
  description?: string;
  items: AdminAttentionItem[];
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}) {
  const visible = items.filter((item) => item.count > 0);

  return (
    <AdminCard className={cn("h-full", className)} aria-labelledby="admin-attention-heading">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 id="admin-attention-heading" className={adminSectionTitle()}>
            {title}
          </h2>
          <p className={adminSectionDesc()}>{description}</p>
        </div>
        {visible.length > 0 ? (
          <AdminStatusBadge tone="warning">
            {visible.reduce((sum, item) => sum + item.count, 0)} open
          </AdminStatusBadge>
        ) : (
          <AdminStatusBadge tone="success">Clear</AdminStatusBadge>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_55%,var(--color-card))] px-4 py-6 text-center">
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            {emptyTitle}
          </p>
          <p className="mt-1 text-[13px] text-[var(--color-muted)]">
            {emptyDescription}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-border)]">
          {visible.map((item) => {
            const tone = item.tone ?? "info";
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="group flex items-center gap-3 py-3.5 transition-colors first:pt-1 last:pb-1 hover:text-[var(--color-primary)]"
                >
                  {item.icon ? (
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        TONE_ICON[tone],
                      )}
                      aria-hidden
                    >
                      {item.icon}
                    </span>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--color-foreground)] group-hover:text-[var(--color-primary)]">
                        {item.title}
                      </p>
                      <AdminStatusBadge tone={TONE_BADGE[tone]}>
                        {item.count}
                      </AdminStatusBadge>
                    </div>
                    <p className="mt-0.5 text-[13px] leading-snug text-[var(--color-muted)]">
                      {item.description}
                    </p>
                  </div>
                  <span
                    className="shrink-0 text-[var(--color-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--color-primary)]"
                    aria-hidden
                  >
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AdminCard>
  );
}
