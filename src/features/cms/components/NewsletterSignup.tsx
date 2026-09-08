"use client";

import { useState, useTransition } from "react";
import { subscribeNewsletterAction } from "@/features/cms/actions";

export function NewsletterSignup({
  buttonText,
  successMessage,
}: {
  buttonText: string;
  successMessage: string;
}) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-5 flex flex-col gap-2 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setMessage(null);
        startTransition(async () => {
          const result = await subscribeNewsletterAction({ email });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setMessage(result.message || successMessage);
          setEmail("");
        });
      }}
    >
      <label className="sr-only" htmlFor="newsletter-email">
        Email
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={pending}
        placeholder="you@example.com"
        className="min-w-0 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 text-sm"
        autoComplete="email"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--color-button-background)] px-4 py-2.5 text-sm font-medium text-[var(--color-button-foreground)] disabled:opacity-50"
      >
        {pending ? "Saving…" : buttonText}
      </button>
      {error ? (
        <p className="basis-full text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="basis-full text-sm text-[var(--color-muted)]" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
