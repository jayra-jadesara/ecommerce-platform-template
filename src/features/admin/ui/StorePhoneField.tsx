"use client";

import TextField, { type TextFieldProps } from "@mui/material/TextField";
import type { ReactNode } from "react";
import {
  type Control,
  type FieldPath,
  type FieldValues,
  Controller,
} from "react-hook-form";
import {
  DEFAULT_PHONE_COUNTRY_CODE,
  sanitizeNationalPhoneInput,
} from "@/lib/phone";

type StorePhoneFieldProps<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
  /** Dial code from Store Information (e.g. +91). */
  countryCode?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: ReactNode;
  label?: string;
} & Omit<
  TextFieldProps,
  "name" | "value" | "onChange" | "error" | "helperText" | "type" | "label"
>;

/**
 * Admin/store phone input: disabled dial-code box + 10-digit national number.
 */
export function StorePhoneField<T extends FieldValues>({
  name,
  control,
  countryCode = DEFAULT_PHONE_COUNTRY_CODE,
  disabled,
  error,
  helperText,
  label = "Phone",
  ...textFieldProps
}: StorePhoneFieldProps<T>) {
  const code = countryCode.trim() || DEFAULT_PHONE_COUNTRY_CODE;

  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-2 sm:gap-3">
      <TextField
        label="Code"
        value={code}
        fullWidth
        size="small"
        disabled
        slotProps={{
          htmlInput: { readOnly: true, "aria-label": "Country calling code" },
        }}
      />
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <TextField
            {...textFieldProps}
            label={label}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="9876543210"
            fullWidth
            size={textFieldProps.size ?? "small"}
            disabled={disabled}
            error={error}
            helperText={
              helperText ?? `10-digit number · code ${code} from Store Information`
            }
            value={field.value ?? ""}
            onBlur={field.onBlur}
            name={field.name}
            inputRef={field.ref}
            onChange={(e) => {
              field.onChange(sanitizeNationalPhoneInput(e.target.value));
            }}
            slotProps={{
              ...textFieldProps.slotProps,
              htmlInput: {
                ...(typeof textFieldProps.slotProps === "object" &&
                textFieldProps.slotProps &&
                "htmlInput" in textFieldProps.slotProps
                  ? (textFieldProps.slotProps.htmlInput as object)
                  : {}),
                maxLength: 10,
                inputMode: "numeric",
                pattern: "[0-9]*",
              },
            }}
          />
        )}
      />
    </div>
  );
}
