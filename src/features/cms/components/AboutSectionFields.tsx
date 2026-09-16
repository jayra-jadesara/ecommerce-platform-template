"use client";

import TextField from "@mui/material/TextField";
import {
  adminFieldGroup,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";
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
          Photo shown beside the story, with an optional name/role badge.
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
          helperText="Shown on the photo badge"
        />
        <TextField
          label="Caption role"
          fullWidth
          value={String(config.imageCaptionRole ?? "")}
          onChange={(e) => setField("imageCaptionRole", e.target.value)}
          helperText='Example: "Founder"'
        />
      </div>

      <div className={adminFieldGroup()} style={adminStackStyle}>
        <p className="admin-field-group__title">3. Heritage train</p>
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--color-primary)_8%,var(--color-card)),var(--color-card)_55%)] shadow-[0_1px_0_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]">
          <div className="border-b border-[var(--color-border)] px-4 py-3.5">
            <p className="text-sm font-semibold tracking-tight text-[var(--color-foreground)]">
              Engine → bogie → bogie
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
              Each milestone appears above <strong>two bogies</strong> on the
              storefront (Britannia-style spacing). Fill year, short title, and
              a one-line story. Use one shared wheel photo for the whole train.
              Leave the list empty to hide the train.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 px-4 py-3">
            {BOGIE_FILL_EXAMPLES.map((ex) => (
              <div
                key={ex.year}
                className="min-w-[9.5rem] flex-1 rounded-xl border border-[color-mix(in_srgb,var(--color-primary)_18%,var(--color-border))] bg-[var(--color-card)] px-3 py-2.5"
              >
                <p
                  className="text-base font-bold leading-none text-[var(--color-primary)]"
                  style={{ fontFamily: "var(--font-display), ui-serif, Georgia, serif" }}
                >
                  {ex.year}
                </p>
                <p className="mt-1 text-xs font-semibold text-[var(--color-foreground)]">
                  {ex.label}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[0.65rem] leading-snug text-[var(--color-muted)]">
                  {ex.description}
                </p>
              </div>
            ))}
          </div>
          <p className="border-t border-[var(--color-border)] px-4 py-2 text-[0.65rem] text-[var(--color-muted)]">
            Examples above — copy the pattern for your brand history (up to 24
            bogies).
          </p>
        </div>
        <ImageField
          label="Wheel image (same on every wheel)"
          value={(config.engineWheelImagePath as string | null) ?? null}
          onPick={() => onPickMedia("engineWheelImagePath")}
          onClear={() => setField("engineWheelImagePath", null)}
        />
        <p className="text-xs text-[var(--color-muted)]">
          One product photo for the locomotive and every bogie. Required for a
          polished train look.
        </p>
        {(
          (config.timelineItems as Array<{
            label?: string;
            year?: string;
            description?: string;
            logoPath?: string | null;
          }>) ?? []
        ).map((item, index) => {
          const items =
            (config.timelineItems as Array<Record<string, unknown>>) ?? [];
          const example = bogieExample(index);
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
          };
          return (
            <div
              key={`timeline-${index}`}
              className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_8px_24px_color-mix(in_srgb,#000_4%,transparent)]"
            >
              <div
                className="absolute inset-y-0 left-0 w-1 bg-[linear-gradient(180deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_40%,var(--color-accent)))]"
                aria-hidden
              />
              <div
                className="pl-4 pr-3 pt-3.5 pb-4"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.9rem",
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] px-2 text-xs font-bold tracking-wide text-[var(--color-primary)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-foreground)]">
                        Bogie {index + 1}
                      </p>
                      <p className="text-[0.65rem] text-[var(--color-muted)]">
                        Milestone on the heritage train
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-xs font-medium text-[var(--color-muted)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)] disabled:opacity-35"
                      disabled={index === 0}
                      onClick={() => moveItem(-1)}
                    >
                      ← Left
                    </button>
                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-xs font-medium text-[var(--color-muted)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)] disabled:opacity-35"
                      disabled={index >= items.length - 1}
                      onClick={() => moveItem(1)}
                    >
                      Right →
                    </button>
                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-xs font-medium text-[var(--color-error)] transition hover:bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)]"
                      onClick={() => {
                        const next = [...items];
                        next.splice(index, 1);
                        setField("timelineItems", next);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
                  <TextField
                    label="Year"
                    fullWidth
                    size="small"
                    value={String(item.year ?? "")}
                    onChange={(e) => updateItem({ year: e.target.value })}
                    placeholder={example.year}
                    helperText={`e.g. ${example.year}`}
                  />
                  <TextField
                    label="Short title"
                    fullWidth
                    size="small"
                    value={String(item.label ?? "")}
                    onChange={(e) => updateItem({ label: e.target.value })}
                    placeholder={example.label}
                    helperText={`e.g. “${example.label}” — sits above this bogie`}
                  />
                </div>
                <TextField
                  label="Description"
                  fullWidth
                  size="small"
                  multiline
                  minRows={2}
                  value={String(item.description ?? "")}
                  onChange={(e) => updateItem({ description: e.target.value })}
                  placeholder={example.description}
                  helperText="One or two sentences under the title on this stop"
                />
              </div>
            </div>
          );
        })}
        <button
          type="button"
          className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_4%,var(--color-card))] px-4 py-3.5 text-sm font-semibold text-[var(--color-primary)] transition hover:border-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-primary)_9%,var(--color-card))] disabled:opacity-50"
          disabled={((config.timelineItems as unknown[]) ?? []).length >= 24}
          onClick={() => {
            const current = (config.timelineItems as unknown[]) ?? [];
            if (current.length >= 24) return;
            setField("timelineItems", [
              ...current,
              { label: "", year: "", description: "", logoPath: null },
            ]);
          }}
        >
          <span className="text-base leading-none">+</span>
          Add bogie / milestone
        </button>
      </div>

      <div className={adminFieldGroup()} style={adminStackStyle}>
        <p className="admin-field-group__title">4. Button (optional)</p>
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
