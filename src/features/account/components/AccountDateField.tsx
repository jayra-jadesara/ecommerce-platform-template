"use client";

import dayjs, { type Dayjs } from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import type { ReactNode } from "react";
import {
  COMPACT_PICKER_CONTROL_HEIGHT,
  getCompactOpenPickerButtonSx,
  getCompactPickerFieldSx,
} from "@/features/admin/ui/picker-field-sx";

const DATE_FORMAT = "YYYY-MM-DD";
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
 * Uses the shared PickersOutlinedInput kit (same height as admin TextFields).
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
          sx: getCompactPickerFieldSx({
            height: COMPACT_PICKER_CONTROL_HEIGHT,
            fullWidth: true,
            maxWidth: { xs: "100%", sm: FIELD_WIDTH },
            fontFamily: THEME_FONT,
            compactTypography: true,
          }),
        },
        openPickerButton: {
          size: "medium",
          edge: false,
          sx: getCompactOpenPickerButtonSx(COMPACT_PICKER_CONTROL_HEIGHT),
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
