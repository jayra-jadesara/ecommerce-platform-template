"use client";

import { useState } from "react";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import ArrowDownwardOutlinedIcon from "@mui/icons-material/ArrowDownwardOutlined";
import ArrowUpwardOutlinedIcon from "@mui/icons-material/ArrowUpwardOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { adminFieldGroup } from "@/features/admin/ui/admin-classes";
import {
  pageOptionLabel,
  StorePageLinkField,
} from "@/features/admin/ui/StorePageLinkField";
import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import { cn } from "@/lib/cn";

export type HeroEditableSlide = {
  imagePath: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  ctaLabel: string;
  ctaHref: string | null;
  secondaryCtaLabel: string;
  secondaryCtaHref: string | null;
};

type Props = {
  title: string;
  subtitle: string;
  description: string;
  slides: HeroEditableSlide[];
  autoplayMs: number;
  showArrows: boolean;
  onChange: (patch: {
    title?: string;
    subtitle?: string;
    description?: string;
    slides?: HeroEditableSlide[];
    autoplayMs?: number;
    showArrows?: boolean;
  }) => void;
  onPickMedia: (field: string) => void;
};

const MAX_SLIDES = 8;

const iconBtn =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-foreground)] disabled:opacity-35 hover:bg-[color-mix(in_srgb,var(--color-foreground)_4%,transparent)]";

function CompactImageField({
  label,
  value,
  onPick,
  onClear,
}: {
  label: string;
  value: string | null | undefined;
  onPick: () => void;
  onClear: () => void;
}) {
  const previewUrl = resolveCmsImageUrl(value);
  return (
    <div
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-2.5"
      style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
    >
      <p className="text-xs font-semibold text-[var(--color-foreground)]">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[9px] text-[var(--color-muted)]">
              —
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          <button
            type="button"
            onClick={onPick}
            className="rounded-md border border-[var(--color-primary)] px-2.5 py-1 text-xs font-medium text-[var(--color-primary)]"
          >
            {value ? "Change" : "Choose image"}
          </button>
          {value ? (
            <button
              type="button"
              onClick={onClear}
              className="rounded-md px-2 py-1 text-xs text-[var(--color-muted)]"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function mapHeroSlides(
  raw: unknown,
  defaults?: {
    title?: string;
    subtitle?: string;
    description?: string;
    primaryButtonText?: string;
    primaryButtonLink?: string | null;
    secondaryButtonText?: string;
    secondaryButtonLink?: string | null;
    backgroundImagePath?: string | null;
  },
): HeroEditableSlide[] {
  const list = Array.isArray(raw) ? raw : [];
  if (list.length > 0) {
    return list.map((item) => {
      const s = (item ?? {}) as Record<string, unknown>;
      return {
        imagePath: String(s.imagePath ?? ""),
        title: String(s.title ?? ""),
        subtitle: String(s.subtitle ?? ""),
        description: String(s.description ?? ""),
        badge: String(s.badge ?? ""),
        ctaLabel: String(s.ctaLabel ?? ""),
        ctaHref: (s.ctaHref as string | null) ?? null,
        secondaryCtaLabel: String(s.secondaryCtaLabel ?? ""),
        secondaryCtaHref: (s.secondaryCtaHref as string | null) ?? null,
      };
    });
  }

  // Seed one slide from legacy section fields so merchants aren't stuck.
  if (
    defaults?.backgroundImagePath?.trim() ||
    defaults?.title?.trim() ||
    defaults?.primaryButtonText?.trim()
  ) {
    return [
      {
        imagePath: defaults.backgroundImagePath?.trim() || "",
        title: defaults.title ?? "",
        subtitle: defaults.subtitle ?? "",
        description: defaults.description ?? "",
        badge: "",
        ctaLabel: defaults.primaryButtonText ?? "",
        ctaHref: defaults.primaryButtonLink ?? "/products",
        secondaryCtaLabel: defaults.secondaryButtonText ?? "",
        secondaryCtaHref: defaults.secondaryButtonLink ?? "/about",
      },
    ];
  }

  return [];
}

export function HeroSectionFields({
  title,
  subtitle,
  description,
  slides,
  autoplayMs,
  showArrows,
  onChange,
  onPickMedia,
}: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(
    slides.length > 0 ? 0 : null,
  );

  function updateSlide(index: number, patch: Partial<HeroEditableSlide>) {
    onChange({
      slides: slides.map((slide, i) =>
        i === index ? { ...slide, ...patch } : slide,
      ),
    });
  }

  function removeAt(index: number) {
    onChange({ slides: slides.filter((_, i) => i !== index) });
    setOpenIndex((current) => {
      if (current === null) return null;
      if (slides.length <= 1) return null;
      if (current === index) return Math.max(0, index - 1);
      if (current > index) return current - 1;
      return current;
    });
  }

  function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= slides.length) return;
    const copy = [...slides];
    const tmp = copy[index]!;
    copy[index] = copy[next]!;
    copy[next] = tmp;
    onChange({ slides: copy });
    setOpenIndex((current) => {
      if (current === index) return next;
      if (current === next) return index;
      return current;
    });
  }

  function addSlide() {
    if (slides.length >= MAX_SLIDES) return;
    const nextIndex = slides.length;
    onChange({
      slides: [
        ...slides,
        {
          imagePath: "",
          title: "",
          subtitle: "",
          description: "",
          badge: "",
          ctaLabel: "Shop products",
          ctaHref: "/products",
          secondaryCtaLabel: "",
          secondaryCtaHref: null,
        },
      ],
    });
    setOpenIndex(nextIndex);
  }

  const autoplaySeconds = Math.round((autoplayMs || 0) / 1000);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
      <div className={adminFieldGroup(true)}>
        <p className="admin-field-group__title">1. Default text</p>
        <p className="admin-field-group__hint">
          Used when a slide leaves headline or eyebrow blank.
        </p>
        <TextField
          label="Default headline"
          fullWidth
          size="small"
          value={title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g. Better quality, greater taste"
        />
        <TextField
          label="Default eyebrow"
          fullWidth
          size="small"
          value={subtitle}
          onChange={(e) => onChange({ subtitle: e.target.value })}
          placeholder="LEADING MANUFACTURER…"
        />
        <TextField
          label="Default supporting line"
          fullWidth
          size="small"
          multiline
          minRows={2}
          maxRows={3}
          value={description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="One or two short sentences."
        />
      </div>

      <div className={adminFieldGroup(true)}>
        <p className="admin-field-group__title">2. Campaign slides</p>
        <p className="admin-field-group__hint">
          Full-bleed photos shoppers see. Open one at a time — each slide has
          its own image and buttons.
        </p>

        {slides.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-4 text-center text-xs text-[var(--color-muted)]">
            No slides yet — add your first campaign image below.
          </p>
        ) : (
          <ul className="space-y-2">
            {slides.map((slide, index) => {
              const open = openIndex === index;
              const summary =
                slide.title.trim() ||
                slide.ctaLabel.trim() ||
                (slide.imagePath ? "Image set" : "Empty slide");
              return (
                <li
                  key={`hero-slide-${index}`}
                  className={cn(
                    "overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]",
                    open &&
                      "border-[color-mix(in_srgb,var(--color-primary)_28%,var(--color-border))]",
                  )}
                >
                  <div className="flex items-center gap-1.5 px-2 py-1.5">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-[color-mix(in_srgb,var(--color-foreground)_3%,transparent)]"
                      onClick={() =>
                        setOpenIndex((current) =>
                          current === index ? null : index,
                        )
                      }
                      aria-expanded={open}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[0.65rem] font-bold tabular-nums text-[var(--color-primary)]">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {summary}
                      </span>
                      <span className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                        {open ? "Hide" : "Edit"}
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={index === 0}
                      aria-label="Move up"
                      className={iconBtn}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUpwardOutlinedIcon sx={{ fontSize: 15 }} />
                    </button>
                    <button
                      type="button"
                      disabled={index === slides.length - 1}
                      aria-label="Move down"
                      className={iconBtn}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDownwardOutlinedIcon sx={{ fontSize: 15 }} />
                    </button>
                    <button
                      type="button"
                      aria-label="Remove slide"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-red-700 hover:bg-red-50"
                      onClick={() => removeAt(index)}
                    >
                      <DeleteOutlineOutlinedIcon sx={{ fontSize: 15 }} />
                    </button>
                  </div>

                  {open ? (
                    <div
                      className="border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_55%,transparent)] px-2.5 py-2.5"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.55rem",
                      }}
                    >
                      <CompactImageField
                        label="Campaign image"
                        value={slide.imagePath || null}
                        onPick={() => onPickMedia(`slides.${index}.imagePath`)}
                        onClear={() => updateSlide(index, { imagePath: "" })}
                      />
                      <TextField
                        label="Eyebrow (optional)"
                        fullWidth
                        size="small"
                        value={slide.subtitle}
                        onChange={(e) =>
                          updateSlide(index, { subtitle: e.target.value })
                        }
                        placeholder="LEADING MANUFACTURER…"
                      />
                      <TextField
                        label="Headline"
                        fullWidth
                        size="small"
                        value={slide.title}
                        onChange={(e) =>
                          updateSlide(index, { title: e.target.value })
                        }
                        placeholder="Falls back to default headline"
                      />
                      <TextField
                        label="Supporting line"
                        fullWidth
                        size="small"
                        multiline
                        minRows={2}
                        maxRows={3}
                        value={slide.description}
                        onChange={(e) =>
                          updateSlide(index, { description: e.target.value })
                        }
                      />
                      <TextField
                        label="Badge (optional)"
                        fullWidth
                        size="small"
                        value={slide.badge}
                        onChange={(e) =>
                          updateSlide(index, { badge: e.target.value })
                        }
                        placeholder="NEW"
                      />
                      <div
                        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-2.5"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.55rem",
                        }}
                      >
                        <p className="text-xs font-semibold">Main button</p>
                        <TextField
                          label="Button text"
                          fullWidth
                          size="small"
                          value={slide.ctaLabel}
                          onChange={(e) =>
                            updateSlide(index, { ctaLabel: e.target.value })
                          }
                          placeholder="Shop products"
                        />
                        <StorePageLinkField
                          value={slide.ctaHref}
                          fallback="/products"
                          onChange={(v) =>
                            updateSlide(index, { ctaHref: v })
                          }
                          helperText={
                            slide.ctaLabel.trim()
                              ? `Opens ${pageOptionLabel(String(slide.ctaHref ?? "/products"))}`
                              : "Leave text blank to hide"
                          }
                        />
                      </div>
                      <div
                        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-2.5"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.55rem",
                        }}
                      >
                        <p className="text-xs font-semibold">
                          Second button (optional)
                        </p>
                        <TextField
                          label="Button text"
                          fullWidth
                          size="small"
                          value={slide.secondaryCtaLabel}
                          onChange={(e) =>
                            updateSlide(index, {
                              secondaryCtaLabel: e.target.value,
                            })
                          }
                          placeholder="About us"
                        />
                        <StorePageLinkField
                          value={slide.secondaryCtaHref}
                          fallback="/about"
                          onChange={(v) =>
                            updateSlide(index, { secondaryCtaHref: v })
                          }
                          helperText={
                            slide.secondaryCtaLabel.trim()
                              ? `Opens ${pageOptionLabel(String(slide.secondaryCtaHref ?? "/about"))}`
                              : "Optional"
                          }
                        />
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          disabled={slides.length >= MAX_SLIDES}
          className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--color-border)] px-2.5 py-2 text-sm font-medium disabled:opacity-50 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          onClick={addSlide}
        >
          <AddOutlinedIcon sx={{ fontSize: 17 }} />
          Add slide
        </button>
      </div>

      <div className={adminFieldGroup(true)}>
        <p className="admin-field-group__title">3. Slideshow</p>
        <p className="admin-field-group__hint">
          Autoplay and arrows when you have more than one slide.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <TextField
            select
            label="Autoplay"
            fullWidth
            size="small"
            value={autoplaySeconds <= 0 ? "0" : String(autoplaySeconds)}
            onChange={(e) =>
              onChange({ autoplayMs: Number(e.target.value) * 1000 })
            }
          >
            <MenuItem value="0">Off</MenuItem>
            <MenuItem value="3">Every 3 seconds</MenuItem>
            <MenuItem value="5">Every 5 seconds</MenuItem>
            <MenuItem value="8">Every 8 seconds</MenuItem>
          </TextField>
          <TextField
            select
            label="Arrows"
            fullWidth
            size="small"
            value={showArrows ? "yes" : "no"}
            onChange={(e) => onChange({ showArrows: e.target.value === "yes" })}
          >
            <MenuItem value="yes">Show</MenuItem>
            <MenuItem value="no">Hide</MenuItem>
          </TextField>
        </div>
      </div>
    </div>
  );
}
