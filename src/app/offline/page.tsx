import type { Metadata } from "next";
import Link from "next/link";
import { buildPrivatePageMetadata } from "@/features/seo/private-metadata";

export const metadata: Metadata = {
  ...buildPrivatePageMetadata("You're offline"),
  title: "You're offline",
  robots: { index: false, follow: false },
};

/**
 * Lightweight offline fallback — not a full offline store.
 * Checkout and payment require connectivity.
 */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
        You&apos;re offline
      </h1>
      <p className="text-[var(--color-muted)]">
        Some store features require an internet connection. Checkout and payment
        are not available offline.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--color-button-background)] px-5 py-2.5 text-sm font-medium text-[var(--color-button-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          Try again
        </Link>
        <Link
          href="/products"
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          Browse products
        </Link>
      </div>
    </main>
  );
}
