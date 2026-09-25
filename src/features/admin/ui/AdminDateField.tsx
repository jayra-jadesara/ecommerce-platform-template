"use client";

import dayjs, { type Dayjs } from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import type { ReactNode } from "react";
import {
  COMPACT_PICKER_CONTROL_HEIGHT,
  getCompactOpenPickerButtonSx,
  getCompactPickerFieldSx,
} from "@/features/admin/ui/picker-field-sx";
import { ADMIN_PICKER_POPPER_PROPS } from "@/features/admin/ui/admin-picker-popper";

const DATE_FORMAT = "YYYY-MM-DD";

function parseDate(value: string | null | undefined): Dayjs | null {
  if (value == null || String(value).trim() === "") return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
}

function formatDate(value: Dayjs | null): string | null {
  if (!value || !value.isValid()) return null;
  return value.format(DATE_FORMAT);
}

export type AdminDateFieldProps = {
  label: string;
  value: string | null | undefined;
  onChange: (next: string | null) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: ReactNode;
  clearable?: boolean;
  fullWidth?: boolean;
  maxDate?: Dayjs | null;
  minDate?: Dayjs | null;
};

/**
 * Theme-token date-only field for Admin (matches TextField / DateTime height).
 */
export function AdminDateField({
  label,
  value,
  onChange,
  disabled,
  error,
  helperText,
  clearable = true,
  fullWidth = true,
  maxDate,
  minDate,
}: AdminDateFieldProps) {
  return (
    <DatePicker
      className="admin-date-field"
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
          fullWidth,
          error,
          helperText,
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
          ...ADMIN_PICKER_POPPER_PROPS,
        },
        desktopPaper: {
          className: "admin-datetime-paper",
          elevation: 8,
        },
      }}
      sx={{
        width: fullWidth ? "100%" : undefined,
      }}
    />
  );
}
