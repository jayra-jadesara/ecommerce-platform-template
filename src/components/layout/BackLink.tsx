"use client";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

interface BackLinkProps {
  /** Fallback destination when there is no in-app history to go back to. */
  href?: string;
  label?: string;
  className?: string;
}

/**
 * Storefront back control — prefers browser history, otherwise navigates to `href`.
 */
export function BackLink({
  href = "/",
  label = "Back",
  className,
}: BackLinkProps) {
  const router = useRouter();

  return (
    <Link
      href={href}
      onClick={(event) => {
        if (typeof window === "undefined") return;
        const canGoBack =
          window.history.length > 1 &&
          Boolean(document.referrer) &&
          (() => {
            try {
              return new URL(document.referrer).origin === window.location.origin;
            } catch {
              return false;
            }
          })();

        if (!canGoBack) return;
        event.preventDefault();
        router.back();
      }}
      className={cn(
        "inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-3.5 py-2 text-sm font-medium text-[var(--color-foreground)] shadow-sm transition-[background-color,border-color,transform] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] motion-safe:active:scale-[0.98]",
        className,
      )}
    >
      <ArrowBackIcon fontSize="small" aria-hidden />
      {label}
    </Link>
  );
}
