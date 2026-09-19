"use client";

import { useState, type ReactNode } from "react";
import TextField from "@mui/material/TextField";
import {
  adminCard,
  adminCardPadding,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import { StorePageLinkField } from "@/features/admin/ui/StorePageLinkField";
import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import { cn } from "@/lib/cn";

export type AboutEditableConfig = Record<string, unknown>;

type PanelId =
  | "story"
  | "vision"
  | "factory"
  | "certificates"
  | "train"
  | "button";

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

function AboutPanel({
  id,
  step,
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  id: PanelId;
  step: number;
  title: string;
  summary: string;
  open: boolean;
  onToggle: (id: PanelId) => void;
  children: ReactNode;
}) {
  return (
    <div className={cn(adminCard(), "overflow-hidden")}>
      <button
        type="button"
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-[var(--color-surface)] md:px-5"
        onClick={() => onToggle(id)}
        aria-expanded={open}
      >
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[0.7rem] font-bold tabular-nums text-[var(--color-primary)]">
          {step}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
            {title}
          </span>
          <span className="mt-0.5 block text-sm leading-snug text-[var(--color-muted)]">
            {summary}
          </span>
        </span>
        <span className="mt-1 shrink-0 text-xs font-semibold text-[var(--color-primary)]">
          {open ? "Hide" : "Edit"}
        </span>
      </button>
      {open ? (
        <div
          className={cn(adminCardPadding(), "border-t border-[var(--color-border)] pt-4")}
          style={adminStackStyle}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
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
  const factorySlides =
    (config.factorySlides as Array<{
      imagePath?: string | null;
      title?: string;
      description?: string;
    }>) ?? [];
  const certificatesSlides =
    (config.certificatesSlides as Array<{
      imagePath?: string | null;
      title?: string;
      description?: string;
    }>) ?? [];
  const [expandedFactory, setExpandedFactory] = useState<number | null>(
    factorySlides.length > 0 ? 0 : null,
  );
  const [expandedCertificates, setExpandedCertificates] = useState<
    number | null
  >(certificatesSlides.length > 0 ? 0 : null);
  const [openPanel, setOpenPanel] = useState<PanelId | null>("story");

  function setField(key: string, value: unknown) {
    onChange({ ...config, [key]: value });
  }

  function togglePanel(id: PanelId) {
    setOpenPanel((cur) => (cur === id ? null : id));
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-muted)]">
        Sections match the order on{" "}
        <span className="font-medium text-[var(--color-foreground)]">/about</span>
        . Open one at a time — preview updates on the right. To show parts on
        the store homepage, use{" "}
        <span className="font-medium text-[var(--color-foreground)]">
          Content → Homepage → Other information
        </span>{" "}
        (same content — no retyping).
      </p>

      <AboutPanel
        id="story"
        step={1}
        title="Story & portrait"
        summary="Heading, story text, quote, and founder photo"
        open={openPanel === "story"}
        onToggle={togglePanel}
      >
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
        <div className="border-t border-[var(--color-border)] pt-4" style={adminStackStyle}>
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            Portrait
          </p>
          <ImageField
            label="Portrait image"
            value={config.imagePath as string | null}
            onPick={() => onPickMedia("imagePath")}
            onClear={() => setField("imagePath", null)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Caption name"
              fullWidth
              size="small"
              value={String(config.imageCaptionName ?? "")}
              onChange={(e) => setField("imageCaptionName", e.target.value)}
              helperText="Optional — e.g. founder name"
            />
            <TextField
              label="Caption role"
              fullWidth
              size="small"
              value={String(config.imageCaptionRole ?? "")}
              onChange={(e) => setField("imageCaptionRole", e.target.value)}
              helperText='Optional — e.g. "Founder"'
            />
          </div>
        </div>
      </AboutPanel>

      <AboutPanel
        id="vision"
        step={2}
        title="Vision & mission"
        summary={
          Boolean(config.visionMissionEnabled)
            ? "On — two-column band on /about"
            : "Off — hidden on /about"
        }
        open={openPanel === "vision"}
        onToggle={togglePanel}
      >
        <AdminToggle
          checked={Boolean(config.visionMissionEnabled)}
          onChange={(checked) => setField("visionMissionEnabled", checked)}
          label="Show on /about"
        />
        {Boolean(config.visionMissionEnabled) ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div style={adminStackStyle}>
              <TextField
                label="Vision heading"
                fullWidth
                size="small"
                value={String(config.visionHeading ?? "Our Vision")}
                onChange={(e) => setField("visionHeading", e.target.value)}
              />
              <TextField
                label="Vision text"
                fullWidth
                size="small"
                multiline
                minRows={4}
                value={String(config.visionText ?? "")}
                onChange={(e) => setField("visionText", e.target.value)}
              />
            </div>
            <div style={adminStackStyle}>
              <TextField
                label="Mission heading"
                fullWidth
                size="small"
                value={String(config.missionHeading ?? "Our Mission")}
                onChange={(e) => setField("missionHeading", e.target.value)}
              />
              <TextField
                label="Mission text"
                fullWidth
                size="small"
                multiline
                minRows={4}
                value={String(config.missionText ?? "")}
                onChange={(e) => setField("missionText", e.target.value)}
              />
            </div>
          </div>
        ) : null}
      </AboutPanel>

      <AboutPanel
        id="factory"
        step={3}
        title="Factory"
        summary={
          Boolean(config.factoryEnabled)
            ? `${factorySlides.length} card${factorySlides.length === 1 ? "" : "s"}`
            : "Off — hidden on /about"
        }
        open={openPanel === "factory"}
        onToggle={togglePanel}
      >
        <AboutSlideCardsEditor
          enabledLabel="Show factory on /about"
          enabled={Boolean(config.factoryEnabled)}
          onEnabledChange={(checked) => setField("factoryEnabled", checked)}
          heading={String(config.factoryHeading ?? "Factory")}
          onHeadingChange={(v) => setField("factoryHeading", v)}
          slides={factorySlides}
          expandedIndex={expandedFactory}
          setExpandedIndex={setExpandedFactory}
          fieldKey="factorySlides"
          setField={setField}
          onPickMedia={onPickMedia}
          addLabel="Add factory photo"
          mode="full"
        />
      </AboutPanel>

      <AboutPanel
        id="certificates"
        step={4}
        title="Certificates"
        summary={
          Boolean(config.certificatesEnabled)
            ? `${certificatesSlides.length} seal${certificatesSlides.length === 1 ? "" : "s"}`
            : "Off — hidden on /about"
        }
        open={openPanel === "certificates"}
        onToggle={togglePanel}
      >
        <AboutSlideCardsEditor
          enabledLabel="Show certificates on /about"
          enabled={Boolean(config.certificatesEnabled)}
          onEnabledChange={(checked) => setField("certificatesEnabled", checked)}
          heading={String(config.certificatesHeading ?? "Certificates")}
          onHeadingChange={(v) => setField("certificatesHeading", v)}
          slides={certificatesSlides}
          expandedIndex={expandedCertificates}
          setExpandedIndex={setExpandedCertificates}
          fieldKey="certificatesSlides"
          setField={setField}
          onPickMedia={onPickMedia}
          addLabel="Add certificate seal"
          mode="imageOnly"
        />
      </AboutPanel>

      <AboutPanel
        id="train"
        step={5}
        title="Heritage train"
        summary={
          timelineItems.length === 0
            ? "No milestones — train stays hidden"
            : `${timelineItems.length} milestone${timelineItems.length === 1 ? "" : "s"}`
        }
        open={openPanel === "train"}
        onToggle={togglePanel}
      >
        <p className="text-sm text-[var(--color-muted)]">
          Year + short title + one sentence per bogie. Empty list hides the
          train.
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
              No milestones yet — add your first below.
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
      </AboutPanel>

      <AboutPanel
        id="button"
        step={6}
        title="Call-to-action button"
        summary={
          String(config.buttonText ?? "").trim()
            ? `“${String(config.buttonText).trim()}”`
            : "Optional — leave blank to hide"
        }
        open={openPanel === "button"}
        onToggle={togglePanel}
      >
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
      </AboutPanel>
    </div>
  );
}

type SlideRow = {
  imagePath?: string | null;
  title?: string;
  description?: string;
};

function AboutSlideCardsEditor({
  enabledLabel,
  enabled,
  onEnabledChange,
  heading,
  onHeadingChange,
  slides,
  expandedIndex,
  setExpandedIndex,
  fieldKey,
  setField,
  onPickMedia,
  addLabel,
  mode = "full",
}: {
  enabledLabel: string;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  heading: string;
  onHeadingChange: (v: string) => void;
  slides: SlideRow[];
  expandedIndex: number | null;
  setExpandedIndex: (v: number | null) => void;
  fieldKey: "factorySlides" | "certificatesSlides";
  setField: (key: string, value: unknown) => void;
  onPickMedia: (field: string) => void;
  addLabel: string;
  /** Certificates: image only — no title/description fields. */
  mode?: "full" | "imageOnly";
}) {
  const imageOnly = mode === "imageOnly";
  return (
    <div style={adminStackStyle}>
      <AdminToggle
        checked={enabled}
        onChange={onEnabledChange}
        label={enabledLabel}
      />
      {enabled ? (
        <>
          <TextField
            label="Section heading"
            fullWidth
            size="small"
            value={heading}
            onChange={(e) => onHeadingChange(e.target.value)}
          />
          {imageOnly ? (
            <p className="text-xs text-[var(--color-muted)]">
              Upload seal / logo images only — they show as circles on the storefront.
            </p>
          ) : (
            <p className="text-xs text-[var(--color-muted)]">
              Photos first. Title and description are optional captions on the storefront.
            </p>
          )}
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
            {slides.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-[var(--color-muted)]">
                {imageOnly
                  ? "No seals yet — add certificate images below."
                  : "No photos yet — add items below."}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {slides.map((slide, index) => {
                  const rows =
                    (slides as Array<Record<string, unknown>>) ?? [];
                  const open = expandedIndex === index;
                  const updateSlide = (patch: Record<string, unknown>) => {
                    const next = [...rows];
                    next[index] = { ...next[index], ...patch };
                    setField(fieldKey, next);
                  };
                  const moveSlide = (dir: -1 | 1) => {
                    const target = index + dir;
                    if (target < 0 || target >= rows.length) return;
                    const next = [...rows];
                    const [row] = next.splice(index, 1);
                    next.splice(target, 0, row);
                    setField(fieldKey, next);
                    setExpandedIndex(target);
                  };
                  const title = String(slide.title ?? "").trim();
                  const thumb = resolveCmsImageUrl(slide.imagePath);
                  const rowLabel = imageOnly
                    ? `Certificate ${index + 1}`
                    : title || "Untitled photo";
                  return (
                    <li key={`${fieldKey}-row-${index}`}>
                      <div className="flex items-stretch gap-1">
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[var(--color-surface)]"
                          onClick={() =>
                            setExpandedIndex(open ? null : index)
                          }
                          aria-expanded={open}
                        >
                          <span className="w-6 shrink-0 text-center text-[0.7rem] font-bold tabular-nums text-[var(--color-muted)]">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span
                            className={
                              imageOnly
                                ? "relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]"
                                : "relative h-9 w-12 shrink-0 overflow-hidden rounded border border-[var(--color-border)] bg-[var(--color-surface)]"
                            }
                          >
                            {thumb ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={thumb}
                                alt=""
                                className={
                                  imageOnly
                                    ? "h-full w-full object-contain p-0.5"
                                    : "h-full w-full object-cover"
                                }
                              />
                            ) : (
                              <span className="flex h-full items-center justify-center text-[0.55rem] text-[var(--color-muted)]">
                                —
                              </span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-foreground)]">
                            {rowLabel}
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
                            disabled={index >= rows.length - 1}
                            aria-label="Move down"
                            onClick={() => moveSlide(1)}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="rounded px-1.5 py-1 text-xs text-[var(--color-error)] hover:bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)]"
                            aria-label="Remove"
                            onClick={() => {
                              const next = [...rows];
                              next.splice(index, 1);
                              setField(fieldKey, next);
                              setExpandedIndex(
                                expandedIndex == null
                                  ? null
                                  : expandedIndex === index
                                    ? null
                                    : expandedIndex > index
                                      ? expandedIndex - 1
                                      : expandedIndex,
                              );
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
                            label={imageOnly ? "Seal image" : "Photo"}
                            value={slide.imagePath}
                            onPick={() =>
                              onPickMedia(`${fieldKey}.${index}.imagePath`)
                            }
                            onClear={() => updateSlide({ imagePath: null })}
                          />
                          {!imageOnly ? (
                            <>
                              <TextField
                                label="Title (optional caption)"
                                fullWidth
                                size="small"
                                value={String(slide.title ?? "")}
                                onChange={(e) =>
                                  updateSlide({ title: e.target.value })
                                }
                              />
                              <TextField
                                label="Description (optional)"
                                fullWidth
                                size="small"
                                multiline
                                minRows={2}
                                value={String(slide.description ?? "")}
                                onChange={(e) =>
                                  updateSlide({ description: e.target.value })
                                }
                              />
                            </>
                          ) : null}
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
            disabled={slides.length >= 8}
            onClick={() => {
              if (slides.length >= 8) return;
              setField(fieldKey, [
                ...slides,
                { imagePath: null, title: "", description: "" },
              ]);
              setExpandedIndex(slides.length);
            }}
          >
            <span className="text-base leading-none">+</span>
            {addLabel}
          </button>
        </>
      ) : null}
    </div>
  );
}
