import Link from "next/link";
import type { SetupChecklistItem } from "@/features/admin/setup/checklist";
import { AdminCard } from "@/features/admin/ui/AdminCard";
import { AdminStatusBadge } from "@/features/admin/ui/AdminStatusBadge";
import { cn } from "@/lib/cn";

/**
 * Plain-language launch checklist for any store owner.
 */
export function AdminSetupChecklist({
  items,
  completedCount,
  alwaysShow = false,
}: {
  items: SetupChecklistItem[];
  completedCount: number;
  /** Show even when all items are complete (dashboard overview). */
  alwaysShow?: boolean;
}) {
  if (!alwaysShow && completedCount >= items.length && items.length > 0) {
    return null;
  }

  const total = items.length;
  const remaining = Math.max(0, total - completedCount);
  const percent =
    total === 0 ? 0 : Math.round((completedCount / total) * 100);
  const allDone = total > 0 && remaining === 0;

  return (
    <AdminCard className="h-full" aria-labelledby="store-setup-heading">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2
            id="store-setup-heading"
            className="text-[15px] font-semibold tracking-tight"
          >
            Getting your store ready
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">
            {allDone
              ? "Everything below is done — you are ready to sell."
              : remaining === 1
                ? "One step left before your store is ready to sell."
                : `${remaining} steps left before your store is ready to sell.`}
          </p>
        </div>
        <AdminStatusBadge tone={allDone ? "success" : "info"}>
          {allDone ? "All set" : `${completedCount}/${total}`}
        </AdminStatusBadge>
      </div>

      <div
        className="mt-4 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-foreground)_8%,transparent)]"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Store setup progress"
      >
        <div
          className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      {allDone ? (
        <div className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--color-success)_28%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_8%,var(--color-card))] px-4 py-4">
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            You are ready to take orders
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-muted)]">
            Next: pack anything in Needs attention, then check Recent orders for
            new customers.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item, index) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-11 items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
                  item.done
                    ? "border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-success)_6%,var(--color-card))]"
                    : "border-[var(--color-border)] hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))]",
                )}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[var(--color-foreground)]">
                    {index + 1}. {item.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--color-muted)]">
                    {item.description}
                  </span>
                </span>
                {item.done ? (
                  <AdminStatusBadge tone="success">Done</AdminStatusBadge>
                ) : (
                  <AdminStatusBadge tone="warning">Do this</AdminStatusBadge>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  );
}
