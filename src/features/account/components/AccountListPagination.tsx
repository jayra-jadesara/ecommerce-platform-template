import Link from "next/link";
import { cn } from "@/lib/cn";

export function AccountListPagination({
  page,
  totalPages,
  basePath,
  range,
  from,
  to,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  range?: string;
  from?: string;
  to?: string;
}) {
  if (totalPages <= 1) return null;

  function hrefFor(target: number) {
    const params = new URLSearchParams();
    if (range && range !== "all") params.set("range", range);
    if (range === "custom") {
      if (from) params.set("from", from);
      if (to) params.set("to", to);
    }
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="mt-5 flex items-center justify-between gap-3 text-sm">
      <Link
        href={hrefFor(Math.max(1, page - 1))}
        className={cn(
          "underline underline-offset-2",
          page <= 1 && "pointer-events-none opacity-40",
        )}
        aria-disabled={page <= 1}
      >
        Previous
      </Link>
      <span className="text-[var(--color-muted)]">
        Page {page} of {totalPages}
      </span>
      <Link
        href={hrefFor(Math.min(totalPages, page + 1))}
        className={cn(
          "underline underline-offset-2",
          page >= totalPages && "pointer-events-none opacity-40",
        )}
        aria-disabled={page >= totalPages}
      >
        Next
      </Link>
    </div>
  );
}
