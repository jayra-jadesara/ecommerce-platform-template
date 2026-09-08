import Link from "next/link";
import type { SetupChecklistItem } from "@/features/admin/setup/checklist";

export function AdminSetupChecklist({
  items,
  completedCount,
}: {
  items: SetupChecklistItem[];
  completedCount: number;
}) {
  return (
    <section
      className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5"
      aria-labelledby="store-setup-heading"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="store-setup-heading"
          className="text-lg font-semibold tracking-tight"
        >
          Complete your store setup
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          {completedCount} of {items.length} done
        </p>
      </div>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Finish these basics before launch. You can skip and return anytime.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={`flex min-h-11 flex-col rounded-lg border px-3 py-2.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${
                item.done
                  ? "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]"
                  : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
              }`}
            >
              <span className="text-sm font-medium">
                {item.done ? "✓ " : ""}
                {item.label}
              </span>
              <span className="text-xs text-[var(--color-muted)]">
                {item.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
