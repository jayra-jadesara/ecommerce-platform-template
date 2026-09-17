"use client";

import TextField from "@mui/material/TextField";
import { useMemo } from "react";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import {
  adminCard,
  adminCardPadding,
  adminSectionDesc,
  adminSectionTitle,
} from "@/features/admin/ui/admin-classes";
import type { CareerSectionConfig } from "@/features/cms/schemas";
import { cn } from "@/lib/cn";

export type CareerEditableConfig = CareerSectionConfig & Record<string, unknown>;

type CareerSectionFieldsProps = {
  config: CareerEditableConfig;
  setField: (key: string, value: unknown) => void;
  disabled?: boolean;
  emailError?: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCareersEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 200) return "Email is too long.";
  if (!EMAIL_RE.test(trimmed)) {
    return "Enter a valid careers email (e.g. hr@yourbrand.com).";
  }
  return null;
}

export function CareerSectionFields({
  config,
  setField,
  disabled,
  emailError,
}: CareerSectionFieldsProps) {
  const paragraphs =
    (config.introParagraphs as string[] | undefined)?.length
      ? (config.introParagraphs as string[])
      : [""];

  const heading = String(config.heading ?? "").trim();
  const previewParas = paragraphs.filter((p) => p.trim());
  const invite = String(config.ctaText ?? "").trim();

  const resolvedEmailHint = useMemo(() => {
    const custom = String(config.careersEmail ?? "").trim();
    if (custom) return custom;
    return "Store contact email (default)";
  }, [config.careersEmail]);

  return (
    <div className="space-y-5">
      {/* Live preview */}
      <div
        className={cn(
          adminCard(),
          "overflow-hidden border-[color-mix(in_srgb,var(--color-primary)_18%,var(--color-border))]",
        )}
      >
        <div className="border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-surface))] px-5 py-3">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
            Store preview
          </p>
        </div>
        <div className="space-y-3 px-5 py-6 text-center md:px-8">
          <p className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--color-foreground)] md:text-3xl">
            {heading || "Page heading"}
          </p>
          {previewParas.length ? (
            <div className="mx-auto max-w-xl space-y-2 text-sm leading-relaxed text-[var(--color-muted)]">
              {previewParas.slice(0, 2).map((p, i) => (
                <p key={i} className="line-clamp-2">
                  {p}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">
              Add intro paragraphs below — shoppers see them under the heading.
            </p>
          )}
          {invite ? (
            <p className="text-sm font-medium text-[var(--color-foreground)]">
              {invite}
            </p>
          ) : null}
          <p className="text-[0.7rem] text-[var(--color-muted)]">
            CV email shown to applicants:{" "}
            <span className="font-medium text-[var(--color-foreground)]">
              {resolvedEmailHint}
            </span>
          </p>
        </div>
      </div>

      {/* Story */}
      <section className={`${adminCard()} ${adminCardPadding()} space-y-4`}>
        <div>
          <h3 className={adminSectionTitle()}>Page story</h3>
          <p className={adminSectionDesc()}>
            The heading becomes the page name everywhere (browser title, breadcrumb,
            admin). Write a short company story, then an invite to apply.
          </p>
        </div>

        <TextField
          label="Heading (page name)"
          fullWidth
          size="small"
          required
          disabled={disabled}
          value={(config.heading as string) ?? ""}
          onChange={(e) => setField("heading", e.target.value)}
          helperText="Used as the page title on the storefront and in admin."
        />

        <div className="space-y-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-[var(--color-foreground)]">
                Intro paragraphs
              </p>
              <p className="text-xs text-[var(--color-muted)]">
                Company story shoppers read before open roles.
              </p>
            </div>
            {paragraphs.length < 6 ? (
              <button
                type="button"
                disabled={disabled}
                className="shrink-0 text-xs font-semibold text-[var(--color-primary)]"
                onClick={() => setField("introParagraphs", [...paragraphs, ""])}
              >
                + Add paragraph
              </button>
            ) : null}
          </div>
          {paragraphs.map((text, index) => (
            <div
              key={index}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                  Paragraph {index + 1}
                </span>
                {paragraphs.length > 1 ? (
                  <button
                    type="button"
                    disabled={disabled}
                    className="text-xs font-medium text-red-700"
                    onClick={() => {
                      setField(
                        "introParagraphs",
                        paragraphs.filter((_, i) => i !== index),
                      );
                    }}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <TextField
                fullWidth
                size="small"
                multiline
                minRows={3}
                disabled={disabled}
                placeholder="Tell candidates about your company…"
                value={text}
                onChange={(e) => {
                  const next = [...paragraphs];
                  next[index] = e.target.value;
                  setField("introParagraphs", next);
                }}
              />
            </div>
          ))}
        </div>

        <TextField
          label="Invite line (optional)"
          fullWidth
          size="small"
          disabled={disabled}
          value={(config.ctaText as string) ?? ""}
          onChange={(e) => setField("ctaText", e.target.value)}
          helperText='One short sentence under the story, e.g. “Ready to join us? Fill the form below.”'
          placeholder="Ready to join us? Fill the form below."
        />
      </section>

      {/* Apply settings */}
      <section className={`${adminCard()} ${adminCardPadding()} space-y-4`}>
        <div>
          <h3 className={adminSectionTitle()}>Apply form & CV email</h3>
          <p className={adminSectionDesc()}>
            No file uploads. Applicants submit details here, then email their CV to
            the address you set.
          </p>
        </div>

        <TextField
          label="Careers email for CVs"
          fullWidth
          size="small"
          type="email"
          disabled={disabled}
          error={Boolean(emailError)}
          value={(config.careersEmail as string) ?? ""}
          onChange={(e) => setField("careersEmail", e.target.value)}
          helperText={
            emailError ||
            "Must be a valid email if filled. Leave blank to use the store contact email."
          }
          placeholder="hr@yourbrand.com"
          slotProps={{ htmlInput: { autoComplete: "email" } }}
        />

        <TextField
          label="Form heading"
          fullWidth
          size="small"
          disabled={disabled}
          value={(config.formTitle as string) ?? ""}
          onChange={(e) => setField("formTitle", e.target.value)}
          helperText="Title above the application form on /career."
        />

        <AdminToggle
          checked={config.formEnabled !== false}
          disabled={disabled}
          onChange={(checked) => setField("formEnabled", checked)}
          label="Show apply form on storefront"
        />
      </section>
    </div>
  );
}
