import Link from "next/link";
import { cn } from "@/lib/cn";
import { sfBtn } from "@/components/ui/storefront-classes";

export type AccountListPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  basePath: string;
  range?: string;
  from?: string;
  to?: string;
  status?: string;
  /** Label for the record type, e.g. "orders" or "payments". */
  noun?: string;
  className?: string;
};

export function AccountListPagination({
  page,
  pageSize,
  total,
  totalPages,
  basePath,
  range,
  from,
  to,
  status,
  noun = "records",
  className,
}: AccountListPaginationProps) {
  if (total <= 0) return null;

  const safePage = Math.min(Math.max(1, page), Math.max(1, totalPages));
  const fromRecord = (safePage - 1) * pageSize + 1;
  const toRecord = Math.min(safePage * pageSize, total);
  const canPrev = safePage > 1;
  const canNext = safePage < totalPages;

  function hrefFor(target: number) {
    const params = new URLSearchParams();
    if (range && range !== "all") params.set("range", range);
    if (range === "custom") {
      if (from) params.set("from", from);
      if (to) params.set("to", to);
    }
    if (status && status !== "all") params.set("status", status);
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        className,
      )}
    >
      <p className="min-w-0 text-sm text-[var(--color-muted)]">
        Showing{" "}
        <span className="font-medium text-[var(--color-foreground)]">
          {fromRecord}–{toRecord}
        </span>{" "}
        of{" "}
        <span className="font-medium text-[var(--color-foreground)]">
          {total}
        </span>{" "}
        {noun}
        {totalPages > 1 ? (
          <>
            {" "}
            · Page {safePage} of {totalPages}
          </>
        ) : null}
      </p>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Link
          href={hrefFor(Math.max(1, safePage - 1))}
          className={cn(
            sfBtn("outline"),
            "!min-h-9 !px-3 !py-1.5 !text-xs",
            !canPrev && "pointer-events-none opacity-40",
          )}
          aria-disabled={!canPrev}
          aria-label="Previous page"
        >
          Previous
        </Link>
        <Link
          href={hrefFor(Math.min(totalPages, safePage + 1))}
          className={cn(
            sfBtn("outline"),
            "!min-h-9 !px-3 !py-1.5 !text-xs",
            !canNext && "pointer-events-none opacity-40",
          )}
          aria-disabled={!canNext}
          aria-label="Next page"
        >
          Next
        </Link>
      </div>
    </div>
  );
}
