import type { SxProps, Theme } from "@mui/material/styles";

/** Match admin TextField / MUI Select `size="small"` control height. */
export const COMPACT_PICKER_CONTROL_HEIGHT = 40;

export type CompactPickerFieldSxOptions = {
  /** Control height in px. Default 40. */
  height?: number;
  /** Stretch to parent width (admin grids). */
  fullWidth?: boolean;
  /** Cap width (account filter bars). */
  maxWidth?: number | { xs?: string | number; sm?: string | number };
  /** Font stack override for storefront filters. */
  fontFamily?: string;
  /** Slightly smaller label/section typography (account filters). */
  compactTypography?: boolean;
};

/**
 * Shared MUI X v9 field sx for DatePicker / DateTimePicker.
 * Targets MuiPickersOutlinedInput (not MuiOutlinedInput).
 */
export function getCompactPickerFieldSx(
  options: CompactPickerFieldSxOptions = {},
): SxProps<Theme> {
  const height = options.height ?? COMPACT_PICKER_CONTROL_HEIGHT;
  const font = options.fontFamily;
  const compact = Boolean(options.compactTypography);

  return {
    width: options.fullWidth ? "100%" : undefined,
    maxWidth: options.maxWidth,
    ...(font ? { fontFamily: font } : {}),
    "& .MuiFormControl-root, &.MuiFormControl-root, &.MuiPickersTextField-root":
      font
        ? {
            fontFamily: font,
          }
        : undefined,
    "& .MuiInputLabel-root": {
      ...(font ? { fontFamily: font } : {}),
      ...(compact
        ? {
            fontSize: "0.8125rem",
            color: "var(--color-muted)",
            transform: "translate(14px, 9px) scale(1)",
            "&.MuiInputLabel-shrink": {
              transform: "translate(14px, -9px) scale(0.75)",
            },
          }
        : {}),
    },
    "& .MuiInputLabel-root.Mui-focused": {
      color: "var(--color-primary)",
    },
    "& .MuiPickersOutlinedInput-root": {
      height,
      minHeight: height,
      maxHeight: height,
      padding: "0 10px 0 12px",
      backgroundColor: "var(--color-card)",
      borderRadius: "var(--radius-default, 0.5rem)",
      boxSizing: "border-box",
      ...(compact
        ? {
            fontSize: "0.8125rem",
            ...(font ? { fontFamily: font } : {}),
          }
        : {
            fontSize: "0.8125rem",
          }),
    },
    "& .MuiPickersOutlinedInput-notchedOutline": {
      borderColor: "var(--color-border)",
    },
    "& .MuiPickersOutlinedInput-root:hover .MuiPickersOutlinedInput-notchedOutline":
      {
        borderColor: "var(--color-primary)",
      },
    "& .MuiPickersOutlinedInput-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
      {
        borderColor: "var(--color-primary)",
        borderWidth: 1.5,
      },
    "& .MuiPickersOutlinedInput-sectionsContainer": {
      padding: "8px 0 !important",
      lineHeight: "22px",
      ...(compact
        ? {
            fontSize: "0.8125rem",
            ...(font ? { fontFamily: font } : {}),
          }
        : {}),
    },
    "& .MuiPickersSectionList-sectionContent, & .MuiPickersInputBase-sectionContent, & .MuiPickersInputBase-section":
      {
        lineHeight: "22px",
        fontSize: "0.8125rem",
        ...(font ? { fontFamily: font } : {}),
      },
    "& .MuiInputAdornment-root": {
      marginLeft: 0,
      marginRight: "2px",
      height: height - 2,
      maxHeight: height - 2,
    },
    "& .MuiSvgIcon-root": {
      color: "var(--color-muted)",
    },
    "& .MuiIconButton-root": {
      color: "var(--color-muted)",
    },
    "& .MuiIconButton-root:hover": {
      color: "var(--color-primary)",
      backgroundColor:
        "color-mix(in srgb, var(--color-primary) 10%, transparent)",
    },
    "& .MuiIconButton-root:hover .MuiSvgIcon-root": {
      color: "var(--color-primary)",
    },
  };
}

/** Open-picker button sized to sit inside a 40px control. */
export function getCompactOpenPickerButtonSx(
  height: number = COMPACT_PICKER_CONTROL_HEIGHT,
): SxProps<Theme> {
  const size = Math.min(34, height - 6);
  return {
    width: size,
    height: size,
    marginRight: "2px",
    padding: "6px",
    color: "var(--color-muted)",
    "&:hover": {
      color: "var(--color-primary)",
      backgroundColor:
        "color-mix(in srgb, var(--color-primary) 10%, transparent)",
    },
    "& .MuiSvgIcon-root": {
      fontSize: "1.35rem",
      color: "inherit",
    },
  };
}
