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
  const displayUrl = formatPreviewUrl(url);
  const displayDescription =
    description.trim() || "Meta description will appear here.";

  return (
    <div
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
      aria-label="Google result preview"
      // Absorb rare HMR / chunk skew between server HTML and client bundle.
      suppressHydrationWarning
    >
      <p
        className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]"
        suppressHydrationWarning
      >
        Google result preview
      </p>
      <p className="truncate text-xl text-[#1a0dab] dark:text-[#8ab4f8]" suppressHydrationWarning>
        {displayTitle.slice(0, 70)}
        {displayTitle.length > 70 ? "…" : ""}
      </p>
      <p className="truncate text-sm text-[#006621] dark:text-[#81c995]" suppressHydrationWarning>
        {displayUrl}
      </p>
      <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]" suppressHydrationWarning>
        {displayDescription.slice(0, 160)}
        {displayDescription.length > 160 ? "…" : ""}
      </p>
    </div>
  );
}

/** Keep preview URLs stable across SSR + client (no locale / host drift). */
function formatPreviewUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "https://example.com/";
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "") || parsed.origin;
    } catch {
      return trimmed;
    }
  }
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `https://example.com${path}`;
}
