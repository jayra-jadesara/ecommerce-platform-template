"use client";

import dayjs, { type Dayjs } from "dayjs";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import type { ReactNode } from "react";
import {
  COMPACT_PICKER_CONTROL_HEIGHT,
  getCompactOpenPickerButtonSx,
  getCompactPickerFieldSx,
} from "@/features/admin/ui/picker-field-sx";

/** Local wall-clock string used by existing admin forms (no seconds). */
export const ADMIN_DATETIME_LOCAL_FORMAT = "YYYY-MM-DDTHH:mm";

export function parseAdminDateTime(
  value: string | null | undefined,
): Dayjs | null {
  if (value == null || String(value).trim() === "") return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
}

export function formatAdminDateTime(value: Dayjs | null): string | null {
  if (!value || !value.isValid()) return null;
  return value.format(ADMIN_DATETIME_LOCAL_FORMAT);
}

/** Convert an ISO timestamp to the admin local datetime string. */
export function isoToAdminDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const parsed = dayjs(iso);
  return parsed.isValid() ? parsed.format(ADMIN_DATETIME_LOCAL_FORMAT) : "";
}

export type AdminDateTimeFieldProps = {
  label: string;
  value: string | null | undefined;
  onChange: (next: string | null) => void;
  onBlur?: () => void;
  name?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: ReactNode;
  fullWidth?: boolean;
  /** Show clear affordance in the field. */
  clearable?: boolean;
};

/**
 * Themed date + time field for Admin.
 * Sized via shared PickersOutlinedInput kit to match TextField height/width.
 */
export function AdminDateTimeField({
  label,
  value,
  onChange,
  onBlur,
  name,
  disabled,
  error,
  helperText,
  fullWidth = true,
  clearable = true,
}: AdminDateTimeFieldProps) {
  return (
    <DateTimePicker
      className="admin-datetime-field"
      label={label}
      value={parseAdminDateTime(value)}
      onChange={(next) => onChange(formatAdminDateTime(next))}
      disabled={disabled}
      ampm
      minutesStep={1}
      closeOnSelect={false}
      slotProps={{
        textField: {
          fullWidth,
          error,
          helperText,
          name,
          onBlur,
          slotProps: {
            inputLabel: { shrink: true },
          },
          sx: getCompactPickerFieldSx({
            height: COMPACT_PICKER_CONTROL_HEIGHT,
            fullWidth,
          }),
        },
        openPickerButton: {
          size: "medium",
          edge: false,
          sx: getCompactOpenPickerButtonSx(COMPACT_PICKER_CONTROL_HEIGHT),
        },
        field: {
          clearable,
        },
        actionBar: {
          actions: ["clear", "today", "accept"],
        },
        popper: {
          className: "admin-datetime-popper",
          placement: "bottom-start",
        },
        desktopPaper: {
          className: "admin-datetime-paper",
          elevation: 8,
          sx: {
            /* MUI sets scrollbarWidth:'thin' which locks Windows to the grey OS bar. */
            "& .MuiMultiSectionDigitalClockSection-root": {
              scrollbarWidth: "unset",
              overflowY: "auto",
              "&::-webkit-scrollbar": {
                width: 8,
                height: 8,
              },
              "&::-webkit-scrollbar-track": {
                background: "var(--scrollbar-track, var(--color-border))",
                borderRadius: 8,
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "var(--color-primary)",
                borderRadius: 8,
                border: "2px solid var(--scrollbar-track, var(--color-border))",
                backgroundClip: "padding-box",
              },
              "&::-webkit-scrollbar-thumb:hover": {
                backgroundColor:
                  "var(--scrollbar-thumb-hover, var(--color-primary))",
              },
            },
          },
        },
        digitalClockSectionItem: {
          sx: {
            "&.Mui-selected": {
              backgroundColor: "var(--color-primary)",
              color: "var(--color-button-foreground)",
            },
          },
        },
      }}
      sx={{
        width: fullWidth ? "100%" : undefined,
      }}
    />
  );
}
