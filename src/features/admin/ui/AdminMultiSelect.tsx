"use client";

import Autocomplete from "@mui/material/Autocomplete";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import type { SxProps, Theme } from "@mui/material/styles";

export type AdminMultiSelectOption = {
  id: string;
  label: string;
};

type AdminMultiSelectProps = {
  options: AdminMultiSelectOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  label: string;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  /** Max chips before "+N". Default 3. */
  limitTags?: number;
};

const fieldSx: SxProps<Theme> = {
  "& .MuiInputBase-root": {
    fontSize: "0.75rem",
    minHeight: 36,
    paddingTop: "4px !important",
    paddingBottom: "4px !important",
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
  "& .MuiChip-root": {
    height: 22,
    fontSize: "0.6875rem",
    backgroundColor:
      "color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))",
    border: "1px solid color-mix(in srgb, var(--color-primary) 22%, var(--color-border))",
  },
  "& .MuiChip-label": {
    paddingLeft: 6,
    paddingRight: 6,
  },
  "& .MuiChip-deleteIcon": {
    fontSize: "0.875rem",
    marginRight: 2,
  },
  "& .MuiAutocomplete-endAdornment": {
    right: 6,
  },
  "& .MuiAutocomplete-popupIndicator, & .MuiAutocomplete-clearIndicator": {
    padding: 2,
  },
  "& .MuiSvgIcon-root": {
    fontSize: "1.1rem",
  },
};

const paperSx: SxProps<Theme> = {
  borderRadius: "var(--radius-default, 0.5rem)",
  border: "1px solid var(--color-border)",
  boxShadow:
    "0 10px 28px color-mix(in srgb, var(--color-foreground) 12%, transparent)",
  marginTop: 4,
  overflow: "hidden",
};

const listboxSx: SxProps<Theme> = {
  fontSize: "0.75rem",
  padding: "2px 0",
  maxHeight: 220,
  "& .MuiAutocomplete-option": {
    minHeight: 30,
    fontSize: "0.75rem",
    lineHeight: 1.3,
    paddingTop: "3px !important",
    paddingBottom: "3px !important",
    paddingLeft: "8px !important",
    paddingRight: "8px !important",
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
 * Compact admin multi-select (chips + searchable checklist).
 * Prefer this over one-off MUI Autocomplete multiples in admin forms.
 */
export function AdminMultiSelect({
  options,
  value,
  onChange,
  label,
  placeholder,
  helperText,
  disabled,
  limitTags = 3,
}: AdminMultiSelectProps) {
  const selected = options.filter((option) => value.includes(option.id));
  const emptyHint =
    placeholder ??
    (selected.length ? "Add another…" : "Type to search…");

  return (
    <Autocomplete
      multiple
      disableCloseOnSelect
      size="small"
      limitTags={limitTags}
      options={options}
      value={selected}
      disabled={disabled}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      onChange={(_, next) => onChange(next.map((item) => item.id))}
      slotProps={{
        paper: { sx: paperSx },
        listbox: { sx: listboxSx },
      }}
      sx={fieldSx}
      renderValue={(tagValue, getItemProps) =>
        tagValue.map((option, index) => {
          const { key, ...tagProps } = getItemProps({ index });
          return (
            <Chip
              key={key}
              label={option.label}
              size="small"
              {...tagProps}
            />
          );
        })
      }
      renderOption={(props, option, { selected: on }) => {
        const { key, ...optionProps } = props;
        return (
          <li key={key} {...optionProps}>
            <Checkbox
              size="small"
              checked={on}
              disableRipple
              sx={{
                mr: 0.75,
                p: 0.25,
                color: "var(--color-muted)",
                "&.Mui-checked": { color: "var(--color-primary)" },
                "& .MuiSvgIcon-root": { fontSize: "1rem" },
              }}
            />
            <span className="truncate text-[0.75rem] leading-snug text-[var(--color-foreground)]">
              {option.label}
            </span>
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={emptyHint}
          helperText={helperText}
          size="small"
        />
      )}
    />
  );
}
