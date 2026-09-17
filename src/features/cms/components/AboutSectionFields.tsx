"use client";

import { useState } from "react";
import TextField from "@mui/material/TextField";
import {
  adminFieldGroup,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import { StorePageLinkField } from "@/features/admin/ui/StorePageLinkField";
import { resolveCmsImageUrl } from "@/features/cms/section-styles";

export type AboutEditableConfig = Record<string, unknown>;

/** Sample milestones shown as placeholders — guides merchants how to fill each bogie. */
const BOGIE_FILL_EXAMPLES = [
  {
    year: "1892",
    label: "Founded",
    description:
      "Britannia was established in Kolkata with an investment of Rs 295.",
  },
  {
    year: "1910",
    label: "Mechanised",
    description:
      "With the advent of electricity, operations were mechanised.",
  },
  {
    year: "1918",
    label: "Incorporated",
    description:
      "The company was incorporated as a public limited company.",
  },
] as const;

function bogieExample(index: number) {
  return BOGIE_FILL_EXAMPLES[index % BOGIE_FILL_EXAMPLES.length]!;
}

type AboutSectionFieldsProps = {
  config: AboutEditableConfig;
  onChange: (value: AboutEditableConfig) => void;
  onPickMedia: (field: string) => void;
};

function ImageField({
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
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
      style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
    >
      <p className="text-sm font-semibold text-[var(--color-foreground)]">
        {label}
      </p>
      {value ? (
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-[var(--color-muted)]">
                Set
              </div>
            )}
          </div>
          <p className="min-w-0 flex-1 truncate text-xs text-[var(--color-muted)]">
            {value}
          </p>
        </div>
      ) : (
        <p className="text-xs text-[var(--color-muted)]">No image selected yet</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onPick}
          className="rounded-md border border-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-[var(--color-primary)]"
        >
          {value ? "Change image" : "Choose image"}
        </button>
        {value ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-md px-3 py-1.5 text-sm text-[var(--color-muted)]"
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function AboutSectionFields({
  config,
  onChange,
  onPickMedia,
}: AboutSectionFieldsProps) {
  const timelineItems =
    (config.timelineItems as Array<{
      label?: string;
      year?: string;
      description?: string;
      logoPath?: string | null;
    }>) ?? [];
  const [expandedBogie, setExpandedBogie] = useState<number | null>(
    timelineItems.length > 0 ? 0 : null,
  );
  const gallerySlides =
    (config.gallerySlides as Array<{
      imagePath?: string | null;
      title?: string;
      description?: string;
    }>) ?? [];
  const [expandedGallery, setExpandedGallery] = useState<number | null>(
    gallerySlides.length > 0 ? 0 : null,
  );

  function setField(key: string, value: unknown) {
    onChange({ ...config, [key]: value });
  }

  return (
    <>
      <div className={adminFieldGroup()} style={adminStackStyle}>
        <p className="admin-field-group__title">1. Story</p>
        <p className="admin-field-group__hint">
          What shoppers read first on /about — heading, story, and optional
          quote.
        </p>
        <TextField
          label="Heading"
          fullWidth
          value={String(config.heading ?? "")}
          onChange={(e) => setField("heading", e.target.value)}
          helperText='Example: "A Visionary Beyond Generations"'
        />
        <TextField
          label="Description"
          fullWidth
          multiline
          minRows={5}
          value={String(config.description ?? "")}
          onChange={(e) => setField("description", e.target.value)}
          helperText="Main founder / brand story"
        />
        <TextField
          label="Quote (optional)"
          fullWidth
          multiline
          minRows={2}
          value={String(config.quote ?? "")}
          onChange={(e) => setField("quote", e.target.value)}
        />
        <TextField
          label="Quote author (optional)"
          fullWidth
          value={String(config.quoteAuthor ?? "")}
          onChange={(e) => setField("quoteAuthor", e.target.value)}
        />
      </div>

      <div className={adminFieldGroup()} style={adminStackStyle}>
        <p className="admin-field-group__title">2. Portrait</p>
        <p className="admin-field-group__hint">
          Photo shown beside the story, with an optional name/role caption.
        </p>
        <ImageField
          label="Portrait image"
          value={config.imagePath as string | null}
          onPick={() => onPickMedia("imagePath")}
          onClear={() => setField("imagePath", null)}
        />
        <TextField
          label="Caption name"
          fullWidth
          value={String(config.imageCaptionName ?? "")}
          onChange={(e) => setField("imageCaptionName", e.target.value)}
          helperText='Optional — e.g. founder name. Clear if unused.'
        />
        <TextField
          label="Caption role"
          fullWidth
          value={String(config.imageCaptionRole ?? "")}
          onChange={(e) => setField("imageCaptionRole", e.target.value)}
          helperText='Optional — e.g. "Founder". Clear if unused.'
        />
      </div>

      <div className={adminFieldGroup()} style={adminStackStyle}>
        <p className="admin-field-group__title">3. Heritage train</p>
        <p className="admin-field-group__hint">
          Compact milestone list (year + title + story). Click a row to edit.
          Empty list hides the train. Pattern: year “1892”, title “Founded”,
          one short sentence.
        </p>
        <ImageField
          label="Wheel image (same on every wheel)"
          value={(config.engineWheelImagePath as string | null) ?? null}
          onPick={() => onPickMedia("engineWheelImagePath")}
          onClear={() => setField("engineWheelImagePath", null)}
        />
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
          {timelineItems.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-[var(--color-muted)]">
              No milestones yet — add your first bogie below.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {timelineItems.map((item, index) => {
                const items =
                  (config.timelineItems as Array<Record<string, unknown>>) ??
                  [];
                const example = bogieExample(index);
                const open = expandedBogie === index;
                const updateItem = (patch: Record<string, unknown>) => {
                  const next = [...items];
                  next[index] = { ...next[index], ...patch };
                  setField("timelineItems", next);
                };
                const moveItem = (dir: -1 | 1) => {
                  const target = index + dir;
                  if (target < 0 || target >= items.length) return;
                  const next = [...items];
                  const [row] = next.splice(index, 1);
                  next.splice(target, 0, row);
                  setField("timelineItems", next);
                  setExpandedBogie(target);
                };
                const year = String(item.year ?? "").trim();
                const label = String(item.label ?? "").trim();
                return (
                  <li key={`timeline-${index}`}>
                    <div className="flex items-stretch gap-1">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[var(--color-surface)]"
                        onClick={() =>
                          setExpandedBogie(open ? null : index)
                        }
                        aria-expanded={open}
                      >
                        <span className="w-6 shrink-0 text-center text-[0.7rem] font-bold tabular-nums text-[var(--color-muted)]">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span
                          className="w-14 shrink-0 text-sm font-bold text-[var(--color-primary)]"
                          style={{
                            fontFamily:
                              "var(--font-display), ui-serif, Georgia, serif",
                          }}
                        >
                          {year || "—"}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-foreground)]">
                          {label || "Untitled milestone"}
                        </span>
                        <span className="shrink-0 text-[0.65rem] text-[var(--color-muted)]">
                          {open ? "Hide" : "Edit"}
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-0.5 pr-2">
                        <button
                          type="button"
                          className="rounded px-1.5 py-1 text-xs text-[var(--color-muted)] hover:bg-[var(--color-surface)] disabled:opacity-30"
                          disabled={index === 0}
                          aria-label="Move up"
                          onClick={() => moveItem(-1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="rounded px-1.5 py-1 text-xs text-[var(--color-muted)] hover:bg-[var(--color-surface)] disabled:opacity-30"
                          disabled={index >= items.length - 1}
                          aria-label="Move down"
                          onClick={() => moveItem(1)}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="rounded px-1.5 py-1 text-xs text-[var(--color-error)] hover:bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)]"
                          aria-label="Remove bogie"
                          onClick={() => {
                            const next = [...items];
                            next.splice(index, 1);
                            setField("timelineItems", next);
                            setExpandedBogie((cur) => {
                              if (cur == null) return null;
                              if (cur === index) return null;
                              if (cur > index) return cur - 1;
                              return cur;
                            });
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    {open ? (
                      <div
                        className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.75rem",
                        }}
                      >
                        <div className="grid gap-2 sm:grid-cols-[6.5rem_minmax(0,1fr)]">
                          <TextField
                            label="Year"
                            fullWidth
                            size="small"
                            value={String(item.year ?? "")}
                            onChange={(e) =>
                              updateItem({ year: e.target.value })
                            }
                            placeholder={example.year}
                          />
                          <TextField
                            label="Short title"
                            fullWidth
                            size="small"
                            value={String(item.label ?? "")}
                            onChange={(e) =>
                              updateItem({ label: e.target.value })
                            }
                            placeholder={example.label}
                          />
                        </div>
                        <TextField
                          label="Description"
                          fullWidth
                          size="small"
                          multiline
                          minRows={2}
                          value={String(item.description ?? "")}
                          onChange={(e) =>
                            updateItem({ description: e.target.value })
                          }
                          placeholder={example.description}
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_4%,var(--color-card))] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition hover:border-[var(--color-primary)] disabled:opacity-50"
          disabled={timelineItems.length >= 24}
          onClick={() => {
            const current = (config.timelineItems as unknown[]) ?? [];
            if (current.length >= 24) return;
            setField("timelineItems", [
              ...current,
              { label: "", year: "", description: "", logoPath: null },
            ]);
            setExpandedBogie(current.length);
          }}
        >
          <span className="text-base leading-none">+</span>
          Add milestone
        </button>
      </div>

      <div className={adminFieldGroup()} style={adminStackStyle}>
        <p className="admin-field-group__title">4. Factory & certificates</p>
        <p className="admin-field-group__hint">
          Factory, quality seal, and process photos — managed like train
          milestones. Image is optional. All cards show in one row and slide
          together on the storefront. Toggle off to hide on /about.
        </p>
        <AdminToggle
          checked={Boolean(config.galleryEnabled)}
          onChange={(checked) => setField("galleryEnabled", checked)}
          label="Show factory & certificate gallery on storefront"
        />
        {Boolean(config.galleryEnabled) ? (
          <>
            <TextField
              label="Autoplay interval (seconds)"
              type="number"
              fullWidth
              size="small"
              slotProps={{ htmlInput: { min: 0, max: 30, step: 0.5 } }}
              value={
                Number(config.galleryAutoplayMs ?? 4500) <= 0
                  ? 0
                  : Number(config.galleryAutoplayMs ?? 4500) / 1000
              }
              onChange={(e) => {
                const seconds = Number(e.target.value);
                if (!Number.isFinite(seconds) || seconds <= 0) {
                  setField("galleryAutoplayMs", 0);
                  return;
                }
                setField(
                  "galleryAutoplayMs",
                  Math.min(30_000, Math.round(seconds * 1000)),
                );
              }}
              helperText="Speed for the shared row scroll. 0 = static row (no motion)."
            />
            <AdminToggle
              checked={config.galleryShowArrows !== false}
              onChange={(checked) => setField("galleryShowArrows", checked)}
              label="Show direction arrows (when 2+ cards)"
            />
            <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
              {gallerySlides.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-[var(--color-muted)]">
                  No items yet — add factory / certificate cards below.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {gallerySlides.map((slide, index) => {
                    const slides =
                      (config.gallerySlides as Array<
                        Record<string, unknown>
                      >) ?? [];
                    const open = expandedGallery === index;
                    const updateSlide = (patch: Record<string, unknown>) => {
                      const next = [...slides];
                      next[index] = { ...next[index], ...patch };
                      setField("gallerySlides", next);
                    };
                    const moveSlide = (dir: -1 | 1) => {
                      const target = index + dir;
                      if (target < 0 || target >= slides.length) return;
                      const next = [...slides];
                      const [row] = next.splice(index, 1);
                      next.splice(target, 0, row);
                      setField("gallerySlides", next);
                      setExpandedGallery(target);
                    };
                    const title = String(slide.title ?? "").trim();
                    const thumb = resolveCmsImageUrl(slide.imagePath);
                    return (
                      <li key={`gallery-row-${index}`}>
                        <div className="flex items-stretch gap-1">
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[var(--color-surface)]"
                            onClick={() =>
                              setExpandedGallery(open ? null : index)
                            }
                            aria-expanded={open}
                          >
                            <span className="w-6 shrink-0 text-center text-[0.7rem] font-bold tabular-nums text-[var(--color-muted)]">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <span className="relative h-9 w-12 shrink-0 overflow-hidden rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
                              {thumb ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={thumb}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="flex h-full items-center justify-center text-[0.55rem] text-[var(--color-muted)]">
                                  —
                                </span>
                              )}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-foreground)]">
                              {title || "Untitled card"}
                            </span>
                            <span className="shrink-0 text-[0.65rem] text-[var(--color-muted)]">
                              {open ? "Hide" : "Edit"}
                            </span>
                          </button>
                          <div className="flex shrink-0 items-center gap-0.5 pr-2">
                            <button
                              type="button"
                              className="rounded px-1.5 py-1 text-xs text-[var(--color-muted)] hover:bg-[var(--color-surface)] disabled:opacity-30"
                              disabled={index === 0}
                              aria-label="Move up"
                              onClick={() => moveSlide(-1)}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="rounded px-1.5 py-1 text-xs text-[var(--color-muted)] hover:bg-[var(--color-surface)] disabled:opacity-30"
                              disabled={index >= slides.length - 1}
                              aria-label="Move down"
                              onClick={() => moveSlide(1)}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              className="rounded px-1.5 py-1 text-xs text-[var(--color-error)] hover:bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)]"
                              aria-label="Remove card"
                              onClick={() => {
                                const next = [...slides];
                                next.splice(index, 1);
                                setField("gallerySlides", next);
                                setExpandedGallery((cur) => {
                                  if (cur == null) return null;
                                  if (cur === index) return null;
                                  if (cur > index) return cur - 1;
                                  return cur;
                                });
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        {open ? (
                          <div
                            className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3"
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.75rem",
                            }}
                          >
                            <ImageField
                              label="Image"
                              value={slide.imagePath}
                              onPick={() =>
                                onPickMedia(
                                  `gallerySlides.${index}.imagePath`,
                                )
                              }
                              onClear={() => updateSlide({ imagePath: null })}
                            />
                            <TextField
                              label="Title"
                              fullWidth
                              size="small"
                              value={String(slide.title ?? "")}
                              onChange={(e) =>
                                updateSlide({ title: e.target.value })
                              }
                              placeholder="Factory Operations & Logistics"
                            />
                            <TextField
                              label="Description"
                              fullWidth
                              size="small"
                              multiline
                              minRows={2}
                              value={String(slide.description ?? "")}
                              onChange={(e) =>
                                updateSlide({ description: e.target.value })
                              }
                              placeholder="Short paragraph under the image"
                            />
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_4%,var(--color-card))] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition hover:border-[var(--color-primary)] disabled:opacity-50"
              disabled={gallerySlides.length >= 8}
              onClick={() => {
                const current = (config.gallerySlides as unknown[]) ?? [];
                if (current.length >= 8) return;
                setField("gallerySlides", [
                  ...current,
                  { imagePath: null, title: "", description: "" },
                ]);
                setExpandedGallery(current.length);
              }}
            >
              <span className="text-base leading-none">+</span>
              Add factory / certificate card
            </button>
          </>
        ) : null}
      </div>

      <div className={adminFieldGroup()} style={adminStackStyle}>
        <p className="admin-field-group__title">5. Button (optional)</p>
        <p className="admin-field-group__hint">
          Optional call-to-action under the story. Leave blank to hide.
        </p>
        <TextField
          label="Button text"
          fullWidth
          value={String(config.buttonText ?? "")}
          onChange={(e) => setField("buttonText", e.target.value)}
          helperText="Leave blank to hide"
        />
        <StorePageLinkField
          value={config.buttonLink as string | null}
          fallback="/contact"
          onChange={(v) => setField("buttonLink", v)}
        />
      </div>
    </>
  );
}
