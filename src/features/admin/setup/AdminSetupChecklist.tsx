import Link from "next/link";
import type { SetupChecklistItem } from "@/features/admin/setup/checklist";
import { AdminCard } from "@/features/admin/ui/AdminCard";
import { AdminStatusBadge } from "@/features/admin/ui/AdminStatusBadge";
import { cn } from "@/lib/cn";

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

  const percent =
    items.length === 0
      ? 0
      : Math.round((completedCount / items.length) * 100);

  return (
    <AdminCard aria-labelledby="store-setup-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="store-setup-heading"
          className="text-[15px] font-semibold tracking-tight"
        >
          Store Setup Progress
        </h2>
        <AdminStatusBadge tone={percent === 100 ? "success" : "info"}>
          {percent}% complete
        </AdminStatusBadge>
      </div>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Finish these basics before launch. You can skip and return anytime.
      </p>

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

      <ul className="mt-4 space-y-2">
        {items.map((item) => (
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
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="block text-xs text-[var(--color-muted)]">
                  {item.description}
                </span>
              </span>
              {item.done ? (
                <AdminStatusBadge tone="success">Done</AdminStatusBadge>
              ) : (
                <AdminStatusBadge tone="warning">Pending</AdminStatusBadge>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </AdminCard>
  );
}
