"use client";

import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import type { ChangeEvent, ReactNode } from "react";

export type AdminSelectOption = {
  value: string;
  label: string;
};

type AdminSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<AdminSelectOption>;
  helperText?: ReactNode;
  disabled?: boolean;
  error?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
  fullWidth?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  className?: string;
};

const menuProps = {
  slotProps: {
    paper: {
      sx: {
        borderRadius: "10px",
        border: "1px solid var(--color-border)",
        boxShadow:
          "0 10px 28px color-mix(in srgb, var(--color-foreground) 12%, transparent)",
        marginTop: "4px",
        maxHeight: 280,
        backgroundColor: "var(--color-card)",
        color: "var(--color-foreground)",
        backgroundImage: "none",
        "& .MuiMenuItem-root": {
          fontSize: "0.8125rem",
          fontFamily: "inherit",
          minHeight: 36,
          py: 0.85,
          borderRadius: "6px",
          mx: 0.5,
          my: 0.15,
        },
        /* Selected: solid muted foreground (matches Tracking / premium admin) */
        "& .MuiMenuItem-root.Mui-selected": {
          backgroundColor:
            "color-mix(in srgb, var(--color-foreground) 72%, transparent) !important",
          color: "var(--color-card) !important",
          fontWeight: 600,
        },
        "& .MuiMenuItem-root.Mui-selected:hover": {
          backgroundColor:
            "color-mix(in srgb, var(--color-foreground) 82%, transparent) !important",
        },
        "& .MuiMenuItem-root:not(.Mui-selected):hover, & .MuiMenuItem-root:not(.Mui-selected).Mui-focused":
          {
            backgroundColor:
              "color-mix(in srgb, var(--color-primary) 10%, var(--color-card))",
          },
      },
    },
  },
};

const EMPTY_VALUE = "__admin_select_empty__";

/**
 * Admin single-select — same height/font as TextField via admin.css.
 * Never uses MenuItem value="" (MUI Select can infinite-loop with empty values).
 */
export function AdminSelect({
  label,
  value,
  onChange,
  options,
  helperText,
  disabled,
  error,
  allowEmpty = false,
  emptyLabel = "None",
  fullWidth = true,
  required,
  name,
  id,
  className,
}: AdminSelectProps) {
  const selectValue =
    allowEmpty && (value === "" || value == null) ? EMPTY_VALUE : value;

  return (
    <TextField
      select
      size="small"
      label={label}
      fullWidth={fullWidth}
      required={required}
      disabled={disabled}
      error={error}
      helperText={helperText}
      value={selectValue}
      name={name}
      id={id}
      className={className}
      onChange={(event: ChangeEvent<HTMLInputElement>) => {
        const next = event.target.value;
        onChange(next === EMPTY_VALUE ? "" : next);
      }}
      slotProps={{
        select: {
          MenuProps: menuProps,
          sx: {
            fontFamily: "inherit",
            fontSize: "inherit",
          },
        },
        input: {
          sx: {
            fontFamily: "inherit",
            fontSize: "inherit",
          },
        },
      }}
    >
      {allowEmpty ? (
        <MenuItem value={EMPTY_VALUE}>{emptyLabel}</MenuItem>
      ) : null}
      {options.map((opt) => (
        <MenuItem key={opt.value} value={opt.value}>
          {opt.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
