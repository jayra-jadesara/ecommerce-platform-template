"use client";

import dayjs, { type Dayjs } from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import type { ReactNode } from "react";

const DATE_FORMAT = "YYYY-MM-DD";
/** Match MUI Select `size="small"` control height (40px). */
const CONTROL_HEIGHT = 40;
/** Keep From/To fields compact — not stretched across the filter bar. */
const FIELD_WIDTH = 168;

const THEME_FONT = "var(--font-sans), system-ui, sans-serif";

function parseDate(value: string | null | undefined): Dayjs | null {
  if (value == null || String(value).trim() === "") return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
}

function formatDate(value: Dayjs | null): string | null {
  if (!value || !value.isValid()) return null;
  return value.format(DATE_FORMAT);
}

export type AccountDateFieldProps = {
  label: string;
  value: string | null | undefined;
  onChange: (next: string | null) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: ReactNode;
  clearable?: boolean;
  maxDate?: Dayjs | null;
  minDate?: Dayjs | null;
};

/**
 * Theme-token date field sized to match storefront Filter Select.
 * MUI X v9 uses PickersOutlinedInput (not MuiOutlinedInput).
 */
export function AccountDateField({
  label,
  value,
  onChange,
  disabled,
  error,
  helperText,
  clearable = false,
  maxDate,
  minDate,
}: AccountDateFieldProps) {
  return (
    <DatePicker
      className="account-date-field"
      label={label}
      value={parseDate(value)}
      onChange={(next) => onChange(formatDate(next))}
      disabled={disabled}
      maxDate={maxDate ?? undefined}
      minDate={minDate ?? undefined}
      format="DD MMM YYYY"
      slotProps={{
        textField: {
          size: "small",
          error,
          helperText,
          sx: {
            width: "100%",
            maxWidth: { xs: "100%", sm: FIELD_WIDTH },
            fontFamily: THEME_FONT,
            "& .MuiFormControl-root, &.MuiFormControl-root, &.MuiPickersTextField-root":
              {
                fontFamily: THEME_FONT,
              },
            "& .MuiInputLabel-root": {
              fontFamily: THEME_FONT,
              fontSize: "0.8125rem",
              color: "var(--color-muted)",
              transform: "translate(14px, 9px) scale(1)",
              "&.MuiInputLabel-shrink": {
                transform: "translate(14px, -9px) scale(0.75)",
              },
            },
            "& .MuiInputLabel-root.Mui-focused": {
              color: "var(--color-primary)",
            },
            "& .MuiPickersOutlinedInput-root": {
              height: CONTROL_HEIGHT,
              minHeight: CONTROL_HEIGHT,
              maxHeight: CONTROL_HEIGHT,
              padding: "0 10px 0 12px",
              backgroundColor: "var(--color-card)",
              borderRadius: "var(--radius-default, 0.5rem)",
              fontSize: "0.8125rem",
              fontFamily: THEME_FONT,
              boxSizing: "border-box",
            },
            "& .MuiPickersOutlinedInput-sectionsContainer": {
              padding: "8px 0 !important",
              lineHeight: "22px",
              fontSize: "0.8125rem",
              fontFamily: THEME_FONT,
            },
            "& .MuiPickersSectionList-sectionContent, & .MuiPickersInputBase-sectionContent, & .MuiPickersInputBase-section":
              {
                lineHeight: "22px",
                fontSize: "0.8125rem",
                fontFamily: THEME_FONT,
              },
            "& .MuiPickersOutlinedInput-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
              {
                borderColor: "var(--color-primary)",
                borderWidth: 1.5,
              },
            "& .MuiPickersOutlinedInput-root:hover .MuiPickersOutlinedInput-notchedOutline":
              {
                borderColor: "var(--color-primary)",
              },
            "& .MuiPickersOutlinedInput-notchedOutline": {
              borderColor: "var(--color-border)",
            },
            "& .MuiInputAdornment-root": {
              marginLeft: 0,
              marginRight: "2px",
              height: CONTROL_HEIGHT - 2,
              maxHeight: CONTROL_HEIGHT - 2,
            },
          },
        },
        openPickerButton: {
          size: "medium",
          edge: false,
          sx: {
            width: 34,
            height: 34,
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
          },
        },
        openPickerIcon: {
          fontSize: "medium",
          sx: { fontSize: "1.35rem" },
        },
        field: {
          clearable,
        },
        actionBar: {
          actions: ["clear", "today", "accept"],
        },
        popper: {
          className: "admin-datetime-popper account-date-popper",
          placement: "bottom-start",
          sx: {
            "& .MuiPaper-root": {
              fontFamily: THEME_FONT,
              width: "auto",
              maxWidth: 320,
            },
            "& .MuiPickersLayout-root": {
              fontFamily: THEME_FONT,
            },
            "& .MuiDayCalendar-root": {
              width: 280,
            },
            "& .MuiPickersCalendarHeader-root, & .MuiDayCalendar-weekDayLabel, & .MuiPickersDay-root, & .MuiPickersLayout-actionBar .MuiButton-root":
              {
                fontFamily: THEME_FONT,
              },
          },
        },
        desktopPaper: {
          className: "admin-datetime-paper",
          elevation: 8,
          sx: {
            fontFamily: THEME_FONT,
            width: "fit-content",
            maxWidth: 320,
            "& .MuiPickersLayout-root": {
              fontFamily: THEME_FONT,
            },
            "& .MuiDayCalendar-root": {
              width: 280,
              margin: "0 auto",
            },
            "& .MuiPickersCalendarHeader-label, & .MuiDayCalendar-weekDayLabel, & .MuiPickersDay-root, & .MuiButton-root":
              {
                fontFamily: THEME_FONT,
              },
          },
        },
      }}
    />
  );
}
