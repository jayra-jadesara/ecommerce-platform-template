"use client";

import { useState, type FormEvent } from "react";
import { sfBtn } from "@/components/ui/storefront-classes";

type ContactMailtoFormProps = {
  email: string;
};

/**
 * Opens the shopper’s mail app with name + message prefilled.
 * Prefer JS mailto over <form action="mailto:"> (more reliable across browsers).
 */
export function ContactMailtoForm({ email }: ContactMailtoFormProps) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedMessage = message.trim();
    if (!trimmedName || !trimmedMessage) {
      setError("Enter your name and message.");
      return;
    }

    const subject = encodeURIComponent(`Contact from ${trimmedName}`);
    const body = encodeURIComponent(
      `Name: ${trimmedName}\n\n${trimmedMessage}`,
    );
    const href = `mailto:${email}?subject=${subject}&body=${body}`;

    // Prefer assigning location — works when window.open is blocked.
    window.location.href = href;
  }

  return (
    <form className="sf-contact-form" onSubmit={onSubmit} noValidate>
      <div>
        <label className="sf-contact-form__label" htmlFor="contact-name">
          Name
        </label>
        <input
          id="contact-name"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="sf-contact-form__input"
          autoComplete="name"
        />
      </div>
      <div>
        <label className="sf-contact-form__label" htmlFor="contact-body">
          Message
        </label>
        <textarea
          id="contact-body"
          name="message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help?"
          className="sf-contact-form__input sf-contact-form__textarea"
        />
      </div>
      {error ? (
        <p className="text-sm text-[var(--color-error)]" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className={sfBtn("primary")}>
        Open email app
      </button>
    </form>
  );
}
