"use client";

import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import type { ReactNode } from "react";
import type { SxProps, Theme } from "@mui/material/styles";

export type AdminAutocompleteOption = {
  value: string;
  label: string;
};

type AdminAutocompleteProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<AdminAutocompleteOption>;
  helperText?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  /** Shown when the list is empty. */
  emptyText?: string;
};

const fieldSx: SxProps<Theme> = {
  "& .MuiInputBase-root": {
    fontSize: "0.8125rem",
    minHeight: 40,
    backgroundColor: "var(--color-card)",
    borderRadius: "var(--radius-default, 0.5rem)",
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--color-border)",
  },
  "& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline": {
    borderColor:
      "color-mix(in srgb, var(--color-primary) 45%, var(--color-border))",
  },
  "& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--color-primary)",
    borderWidth: 1.5,
  },
  "& .MuiInputLabel-root": {
    fontSize: "0.8125rem",
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "var(--color-primary)",
  },
  "& .MuiFormHelperText-root": {
    fontSize: "0.6875rem",
    marginLeft: 0,
    marginTop: 4,
  },
};

const paperSx: SxProps<Theme> = {
  borderRadius: "10px",
  border: "1px solid var(--color-border)",
  boxShadow:
    "0 10px 28px color-mix(in srgb, var(--color-foreground) 12%, transparent)",
  marginTop: "4px",
  backgroundColor: "var(--color-card)",
  color: "var(--color-foreground)",
  backgroundImage: "none",
};

const listboxSx: SxProps<Theme> = {
  fontSize: "0.8125rem",
  padding: "4px 0",
  maxHeight: 280,
  "& .MuiAutocomplete-option": {
    minHeight: 36,
    fontSize: "0.8125rem",
    lineHeight: 1.35,
    py: 0.75,
  },
  "& .MuiAutocomplete-option.Mui-focused": {
    backgroundColor:
      "color-mix(in srgb, var(--color-primary) 8%, var(--color-card))",
  },
  "& .MuiAutocomplete-option[aria-selected='true']": {
    backgroundColor:
      "color-mix(in srgb, var(--color-primary) 12%, var(--color-card))",
  },
};

/**
 * Searchable single-select for long option lists (e.g. store account emails).
 */
export function AdminAutocomplete({
  label,
  value,
  onChange,
  options,
  helperText,
  placeholder = "Type to search…",
  disabled,
  error,
  required,
  fullWidth = true,
  emptyText = "No matches",
}: AdminAutocompleteProps) {
  const selected =
    options.find((option) => option.value === value) ?? null;

  return (
    <Autocomplete
      size="small"
      fullWidth={fullWidth}
      disabled={disabled}
      options={[...options]}
      value={selected}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(a, b) => a.value === b.value}
      filterOptions={(opts, state) => {
        const q = state.inputValue.trim().toLowerCase();
        if (!q) return opts;
        return opts.filter(
          (option) =>
            option.label.toLowerCase().includes(q) ||
            option.value.toLowerCase().includes(q),
        );
      }}
      noOptionsText={emptyText}
      onChange={(_, next) => onChange(next?.value ?? "")}
      slotProps={{
        paper: { sx: paperSx },
        listbox: { sx: listboxSx },
      }}
      sx={fieldSx}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          error={error}
          helperText={helperText}
          placeholder={placeholder}
          size="small"
        />
      )}
    />
  );
}
