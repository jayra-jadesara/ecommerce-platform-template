/**
 * Soft-nav pending UI for admin protected pages.
 * Renders in the layout children slot so AdminShell (sidebar/top bar) stays mounted.
 */
export default function AdminProtectedLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading page">
      <div className="space-y-2">
        <div className="h-3 w-28 animate-pulse rounded bg-[color-mix(in_srgb,var(--color-foreground)_8%,var(--color-surface))]" />
        <div className="h-7 w-48 animate-pulse rounded-lg bg-[color-mix(in_srgb,var(--color-foreground)_10%,var(--color-surface))]" />
        <div className="h-4 max-w-md animate-pulse rounded bg-[color-mix(in_srgb,var(--color-foreground)_6%,var(--color-surface))]" />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-10 animate-pulse rounded-[10px] border border-[var(--color-border)] bg-[var(--color-card)]" />
        <div className="h-10 animate-pulse rounded-[10px] border border-[var(--color-border)] bg-[var(--color-card)]" />
        <div className="h-10 animate-pulse rounded-[10px] border border-[var(--color-border)] bg-[var(--color-card)]" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_1px_2px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
          <div className="h-3 w-full max-w-sm animate-pulse rounded bg-[color-mix(in_srgb,var(--color-foreground)_8%,transparent)]" />
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="h-9 animate-pulse rounded-lg bg-[color-mix(in_srgb,var(--color-foreground)_5%,var(--color-surface))]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
