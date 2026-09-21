"use client";

import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import { useEffect, useId, useState, useTransition } from "react";
import { subscribeNewsletterAction } from "@/features/cms/actions";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "sf-newsletter-subscribed";

function readSubscribed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberSubscribed() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return "Enter your email.";
  if (!email.includes("@")) {
    return "Include an @ in your email address.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Enter a valid email address.";
  }
  return null;
}

export function NewsletterSignup({
  buttonText,
  successMessage,
}: {
  buttonText: string;
  successMessage: string;
}) {
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [statusMessage, setStatusMessage] = useState(successMessage);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setDone(readSubscribed());
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div
        className="mt-5 h-12 w-full animate-pulse rounded-[var(--radius-default,0.75rem)] bg-[color-mix(in_srgb,var(--color-surface)_80%,var(--color-card))]"
        aria-hidden
      />
    );
  }

  if (done) {
    return (
      <div
        className="sf-newsletter-success mt-5 flex w-full items-center justify-center gap-3 rounded-[var(--radius-default,0.75rem)] border border-[color-mix(in_srgb,var(--color-primary)_28%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-card))] px-3.5 py-3 text-center shadow-[0_6px_20px_color-mix(in_srgb,var(--color-foreground)_5%,transparent)] sm:gap-4 sm:px-5 sm:py-3.5"
        role="status"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-button-foreground)] shadow-sm">
          <CheckCircleOutlinedIcon sx={{ fontSize: 20 }} aria-hidden />
        </span>
        <div className="min-w-0 text-left">
          <p className="text-sm font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[15px]">
            {statusMessage}
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-[var(--color-muted)] sm:text-xs">
            You’re on the list — offers and new products will reach your inbox.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="sf-newsletter-form mt-5 w-full">
      <form
        noValidate
        className="rounded-[var(--radius-default,0.75rem)] border border-[var(--color-border)] bg-[var(--color-card)] p-2.5 shadow-[0_8px_24px_color-mix(in_srgb,var(--color-foreground)_5%,transparent)] sm:p-3"
        onSubmit={(event) => {
          event.preventDefault();
          const validationError = validateEmail(email);
          if (validationError) {
            setError(validationError);
            return;
          }
          setError(null);
          startTransition(async () => {
            const result = await subscribeNewsletterAction({
              email: email.trim(),
            });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setStatusMessage(result.message || successMessage);
            rememberSubscribed();
            setEmail("");
            setDone(true);
          });
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <label className="sr-only" htmlFor={fieldId}>
            Email
          </label>
          <div className="relative min-w-0 flex-1">
            <EmailOutlinedIcon
              aria-hidden
              sx={{ fontSize: 18 }}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
            />
            <input
              id={fieldId}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              disabled={pending}
              placeholder="you@example.com"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              className={cn(
                "h-10 w-full rounded-[calc(var(--radius-default,0.75rem)-2px)] border bg-[var(--color-surface)] py-2 pl-10 pr-3 text-sm text-[var(--color-foreground)]",
                "placeholder:text-[var(--color-muted)]",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
                "disabled:opacity-60",
                error
                  ? "border-[color-mix(in_srgb,var(--color-error)_55%,var(--color-border))]"
                  : "border-[var(--color-border)]",
              )}
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className={cn(
              "h-10 shrink-0 rounded-[calc(var(--radius-default,0.75rem)-2px)] bg-[var(--color-button-background)] px-5 text-sm font-semibold text-[var(--color-button-foreground)] shadow-sm",
              "transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
            )}
          >
            {pending ? "Saving…" : buttonText}
          </button>
        </div>
      </form>

      {error ? (
        <p
          id={errorId}
          className="mt-2 flex items-start gap-2 rounded-[var(--radius-default,0.65rem)] border border-[color-mix(in_srgb,var(--color-error)_32%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-error)_7%,var(--color-card))] px-3 py-2 text-left text-xs font-medium leading-snug text-[var(--color-error)]"
          role="alert"
        >
          <span
            className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-error)] text-[9px] font-bold text-white"
            aria-hidden
          >
            !
          </span>
          {error}
        </p>
      ) : (
        <p className="mt-2 text-center text-[11px] text-[var(--color-muted)]">
          No spam — unsubscribe anytime from future emails.
        </p>
      )}
    </div>
  );
}
