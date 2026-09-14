"use client";

import { AdminStatusBadge } from "@/features/admin/ui/AdminStatusBadge";
import { activityEventPill } from "@/features/orders/activity-ui";
import type { OrderActivityView } from "@/features/orders/types";
import { formatDateTime } from "@/lib/format-date";
import { cn } from "@/lib/cn";

/**
 * Compact vertical O—O—O activity list (newest first, one line per event).
 */
export function AdminActivityTimeline({
  activities,
}: {
  activities: OrderActivityView[];
}) {
  if (!activities.length) {
    return (
      <p className="mt-3 text-sm text-[var(--color-muted)]">No activity yet.</p>
    );
  }

  return (
    <ol className="mt-4">
      {activities.map((activity, index) => {
        const pill = activityEventPill(activity.eventType, activity.metadata);
        const isLast = index === activities.length - 1;
        return (
          <li key={activity.id} className="relative flex gap-3 pb-3 last:pb-0">
            <div className="relative flex w-3 shrink-0 flex-col items-center">
              <span
                className={cn(
                  "relative z-[1] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--color-primary)] bg-[var(--color-primary)]",
                  index === 0 &&
                    "ring-2 ring-[color-mix(in_srgb,var(--color-primary)_22%,transparent)]",
                )}
                aria-hidden
              />
              {!isLast ? (
                <span
                  aria-hidden
                  className="absolute top-[0.85rem] bottom-0 w-0.5 bg-[var(--color-border)]"
                />
              ) : null}
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 py-0.5">
              <AdminStatusBadge tone={pill.tone}>{pill.label}</AdminStatusBadge>
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-foreground)]">
                {activity.message || activity.eventType}
              </p>
              <time
                dateTime={activity.createdAt}
                className="shrink-0 text-[11px] text-[var(--color-muted)] sm:text-xs"
              >
                {formatDateTime(activity.createdAt)}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
