"use client";

import { resolveCmsImageUrl } from "@/features/cms/section-styles";

type ImageFieldProps = {
  label: string;
  value: string | null | undefined;
  onPick: () => void;
  onClear: () => void;
};

/** Compact media picker used in homepage section editors. */
export function ImageField({ label, value, onPick, onClear }: ImageFieldProps) {
  const previewUrl = resolveCmsImageUrl(value);

  return (
    <div
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3"
      style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}
    >
      <p className="text-sm font-semibold text-[var(--color-foreground)]">{label}</p>
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
