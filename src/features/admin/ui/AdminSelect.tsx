"use client";

import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import type { SxProps, Theme } from "@mui/material/styles";
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

const fieldSx: SxProps<Theme> = {
  "& .MuiInputBase-root": {
    fontSize: "0.75rem",
    minHeight: 36,
    backgroundColor: "var(--color-card)",
    borderRadius: "var(--radius-default, 0.5rem)",
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--color-border)",
  },
  "& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: "color-mix(in srgb, var(--color-primary) 45%, var(--color-border))",
  },
  "& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--color-primary)",
    borderWidth: 1.5,
  },
  "& .MuiInputLabel-root": {
    fontSize: "0.75rem",
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "var(--color-primary)",
  },
  "& .MuiFormHelperText-root": {
    fontSize: "0.6875rem",
    marginLeft: 0,
    marginTop: 4,
  },
  "& .MuiSelect-select": {
    paddingTop: "8px",
    paddingBottom: "8px",
  },
  "& .MuiSvgIcon-root": {
    fontSize: "1.1rem",
  },
};

const menuProps = {
  slotProps: {
    paper: {
      sx: {
        borderRadius: "var(--radius-default, 0.5rem)",
        border: "1px solid var(--color-border)",
        boxShadow:
          "0 10px 28px color-mix(in srgb, var(--color-foreground) 12%, transparent)",
        marginTop: 4,
        maxHeight: 280,
        "& .MuiMenuItem-root": {
          fontSize: "0.75rem",
          minHeight: 32,
          py: 0.5,
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
 * Compact admin single-select. Prefer over one-off MUI TextField select.
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
      sx={fieldSx}
      slotProps={{
        select: {
          MenuProps: menuProps,
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
