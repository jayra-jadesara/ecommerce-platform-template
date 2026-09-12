"use client";

import type { Control, UseFormSetValue } from "react-hook-form";
import { Controller } from "react-hook-form";
import { SectionAccentHeading } from "@/components/ui/SectionAccentHeading";
import {
  SAFE_FONT_OPTIONS,
  type ThemeEditorFormValues,
} from "@/features/admin/theme/editor-schema";
import {
  HEADING_HIGHLIGHT_STYLES,
  HEADING_HIGHLIGHT_STYLE_LABELS,
} from "@/features/theme/heading-highlight";
import { adminFieldsGrid } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";

type TypographyStudioPanelProps = {
  control: Control<ThemeEditorFormValues>;
  setValue: UseFormSetValue<ThemeEditorFormValues>;
  canUpdate: boolean;
  pending: boolean;
};

function FontPicker({
  name,
  control,
  setValue,
  canUpdate,
  pending,
  mode,
}: {
  name: "fontDisplay" | "fontSans";
  control: Control<ThemeEditorFormValues>;
  setValue: UseFormSetValue<ThemeEditorFormValues>;
  canUpdate: boolean;
  pending: boolean;
  mode: "heading" | "body";
}) {
  const options = SAFE_FONT_OPTIONS.filter(
    (font) => font.bestFor === mode || font.bestFor === "both",
  );

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div
          className={adminFieldsGrid(2)}
          role="radiogroup"
          aria-label={mode === "heading" ? "Heading font" : "Body font"}
        >
          {options.map((font) => {
            const selected = field.value === font.id;
            return (
              <button
                key={`${name}-${font.id}`}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={!canUpdate || pending}
                onClick={() =>
                  setValue(name, font.id, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                className={cn(
                  "group relative overflow-hidden rounded-2xl border p-4 text-left transition-all",
                  selected
                    ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] shadow-[0_10px_28px_color-mix(in_srgb,var(--color-primary)_16%,transparent)]"
                    : "border-[var(--color-border)] bg-[var(--color-card)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))] hover:shadow-[0_8px_20px_color-mix(in_srgb,var(--color-foreground)_8%,transparent)]",
                )}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-16 opacity-70"
                  style={{
                    background:
                      "radial-gradient(ellipse 80% 100% at 10% 0%, color-mix(in srgb, var(--color-primary) 14%, transparent), transparent 70%)",
                  }}
                  aria-hidden
                />
                <div className="relative flex items-start justify-between gap-2">
                  <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    {font.mood}
                  </span>
                  {selected ? (
                    <span className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--color-button-foreground)]">
                      Selected
                    </span>
                  ) : null}
                </div>
                {mode === "heading" ? (
                  <p
                    className="relative mt-3 text-3xl font-semibold tracking-tight text-[var(--color-foreground)]"
                    style={{ fontFamily: font.css }}
                  >
                    Aa
                  </p>
                ) : (
                  <p
                    className="relative mt-3 text-[0.95rem] leading-relaxed text-[var(--color-foreground)]"
                    style={{ fontFamily: font.css }}
                  >
                    The quick brown fox jumps over the lazy dog.
                  </p>
                )}
                <p className="relative mt-3 text-sm font-semibold text-[var(--color-foreground)]">
                  {font.label}
                </p>
                <p className="relative mt-0.5 text-xs text-[var(--color-muted)]">
                  {font.blurb}
                </p>
              </button>
            );
          })}
        </div>
      )}
    />
  );
}

/**
 * Appearance → Typography: premium font + highlighter gallery.
 */
export function TypographyStudioPanel({
  control,
  setValue,
  canUpdate,
  pending,
}: TypographyStudioPanelProps) {
  return (
    <section className="space-y-8" aria-labelledby="type-heading">
      <header className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 70% 80% at 0% 0%, color-mix(in srgb, var(--color-primary) 16%, transparent), transparent 55%), radial-gradient(ellipse 55% 70% at 100% 100%, color-mix(in srgb, var(--color-accent) 14%, transparent), transparent 50%)",
          }}
        />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
            Store typography
          </p>
          <h2 id="type-heading" className="mt-1 text-xl font-semibold tracking-tight">
            Fonts &amp; heading accents
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted)]">
            Pick premium typefaces shoppers associate with quality brands, then
            choose a highlighter for the last word of page and section titles.
            Changes show instantly in Live Preview.
          </p>
        </div>
      </header>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold">Heading font</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Display type for heroes, page titles, and section headings.
          </p>
        </div>
        <FontPicker
          name="fontDisplay"
          control={control}
          setValue={setValue}
          canUpdate={canUpdate}
          pending={pending}
          mode="heading"
        />
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold">Body font</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Readable type for product copy, paragraphs, and UI labels.
          </p>
        </div>
        <FontPicker
          name="fontSans"
          control={control}
          setValue={setValue}
          canUpdate={canUpdate}
          pending={pending}
          mode="body"
        />
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          aria-hidden
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 70%, transparent), transparent), radial-gradient(ellipse 60% 50% at 80% 0%, color-mix(in srgb, var(--color-primary) 12%, transparent), transparent 60%)",
          }}
        />
        <div className="relative space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Accent decoration
            </p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight">
              Heading highlighter
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-[var(--color-muted)]">
              One store-wide look on the last word of storefront titles (Products,
              About, Blog, Account, CMS sections, and more). Managed here only —
              not per page.
            </p>
          </div>

          <Controller
            control={control}
            name="headingHighlightStyle"
            render={({ field }) => (
              <div
                className={adminFieldsGrid(2)}
                role="radiogroup"
                aria-label="Heading highlighter design"
              >
                {HEADING_HIGHLIGHT_STYLES.map((id) => {
                  const meta = HEADING_HIGHLIGHT_STYLE_LABELS[id];
                  const selected = field.value === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={!canUpdate || pending}
                      onClick={() =>
                        setValue("headingHighlightStyle", id, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      className={cn(
                        "relative overflow-hidden rounded-2xl border p-4 text-left transition-all",
                        selected
                          ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] shadow-[0_12px_30px_color-mix(in_srgb,var(--color-primary)_14%,transparent)]"
                          : "border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_55%,var(--color-card))] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))]",
                      )}
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        {meta.premium ? (
                          <span className="rounded-full bg-[color-mix(in_srgb,var(--color-primary)_16%,transparent)] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[var(--color-primary)]">
                            Premium
                          </span>
                        ) : (
                          <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
                            Classic
                          </span>
                        )}
                        {selected ? (
                          <span className="text-[0.65rem] font-semibold text-[var(--color-primary)]">
                            Active
                          </span>
                        ) : null}
                      </div>
                      <div className="flex min-h-[3.25rem] items-center rounded-xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-card)] px-3 py-2">
                        <SectionAccentHeading
                          title="Our product range"
                          accentWord="range"
                          highlightStyle={id}
                          align="left"
                          className="!text-[1.05rem]"
                        />
                      </div>
                      <p className="mt-3 text-sm font-semibold">{meta.title}</p>
                      <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                        {meta.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          />
        </div>
      </div>

      <p className="text-xs text-[var(--color-muted)]">
        Fonts are curated Google / system faces only — arbitrary remote font URLs
        are not allowed.
      </p>
    </section>
  );
}
