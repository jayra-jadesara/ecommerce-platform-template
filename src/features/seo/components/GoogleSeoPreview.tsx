"use client";

/**
 * Lightweight Google-style search preview — local only, no network.
 */
export function GoogleSeoPreview({
  title,
  url,
  description,
}: {
  title: string;
  url: string;
  description: string;
}) {
  const displayTitle = title.trim() || "Page title";
  const displayUrl = url.trim() || "https://example.com/";
  const displayDescription =
    description.trim() || "Meta description will appear here.";

  return (
    <div
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
      aria-label="Search result preview"
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
        Search preview
      </p>
      <p className="truncate text-xl text-[#1a0dab] dark:text-[#8ab4f8]">
        {displayTitle.slice(0, 70)}
        {displayTitle.length > 70 ? "…" : ""}
      </p>
      <p className="truncate text-sm text-[#006621] dark:text-[#81c995]">
        {displayUrl}
      </p>
      <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]">
        {displayDescription.slice(0, 160)}
        {displayDescription.length > 160 ? "…" : ""}
      </p>
    </div>
  );
}
