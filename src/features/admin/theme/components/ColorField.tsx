"use client";

import TextField from "@mui/material/TextField";
import type { Control, FieldPath } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { ThemeEditorFormValues } from "@/features/admin/theme/editor-schema";
import { contrastGuidance } from "@/features/admin/theme/contrast";
import { FieldError } from "@/features/admin/ui/FieldError";

function toColorInputValue(value: string): string {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return "#000000";
}

export function ColorField({
  control,
  name,
  label,
  disabled,
  contrastAgainst,
}: {
  control: Control<ThemeEditorFormValues>;
  name: FieldPath<ThemeEditorFormValues>;
  label: string;
  disabled?: boolean;
  /** Optional background hex to evaluate contrast of this color as foreground. */
  contrastAgainst?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const guidance =
          contrastAgainst && typeof field.value === "string"
            ? contrastGuidance(String(field.value), contrastAgainst)
            : null;
        return (
          <div className="flex flex-col gap-2">
            <label
              htmlFor={`color-text-${String(name)}`}
              className="text-sm font-medium text-[var(--color-foreground)]"
            >
              {label}
            </label>
            <div className="flex items-start gap-2">
              <input
                type="color"
                aria-label={`${label} color picker`}
                disabled={disabled}
                value={toColorInputValue(String(field.value ?? "#000000"))}
                onChange={(event) => field.onChange(event.target.value)}
                className="h-11 w-12 cursor-pointer rounded-[var(--radius-default,0.5rem)] border border-[var(--color-border)] bg-transparent p-1"
              />
              <TextField
                id={`color-text-${String(name)}`}
                fullWidth
                size="small"
                disabled={disabled}
                value={String(field.value ?? "")}
                onChange={(event) => field.onChange(event.target.value)}
                onBlur={field.onBlur}
                error={Boolean(fieldState.error)}
                helperText={
                  fieldState.error
                    ? undefined
                    : guidance
                      ? `${guidance.label} (${guidance.ratio}:1)`
                      : "e.g. #1a5f4a"
                }
                slotProps={{
                  htmlInput: { "aria-label": `${label} color value` },
                }}
              />
            </div>
            <FieldError message={fieldState.error?.message} />
          </div>
        );
      }}
    />
  );
}
