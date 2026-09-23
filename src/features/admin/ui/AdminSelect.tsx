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
          fontSize: "0.75rem",
          fontFamily: "inherit",
          minHeight: 32,
          py: 0.75,
        },
        "& .MuiMenuItem-root.Mui-selected": {
          backgroundColor:
            "color-mix(in srgb, var(--color-primary) 12%, var(--color-card))",
        },
        "& .MuiMenuItem-root.Mui-focused, & .MuiMenuItem-root:hover": {
          backgroundColor:
            "color-mix(in srgb, var(--color-primary) 8%, var(--color-card))",
        },
      },
    },
  },
};

/**
 * Admin single-select — same height/font as TextField via admin.css.
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
      value={value}
      name={name}
      id={id}
      className={className}
      onChange={(event: ChangeEvent<HTMLInputElement>) => {
        onChange(event.target.value);
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
      {allowEmpty ? <MenuItem value="">{emptyLabel}</MenuItem> : null}
      {options.map((opt) => (
        <MenuItem key={opt.value} value={opt.value}>
          {opt.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
