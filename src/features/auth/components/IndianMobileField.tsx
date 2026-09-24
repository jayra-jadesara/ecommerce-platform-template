"use client";

import TextField, { type TextFieldProps } from "@mui/material/TextField";
import type { ReactNode } from "react";
import {
  type Control,
  type FieldPath,
  type FieldValues,
  Controller,
} from "react-hook-form";
import { REGISTER_COUNTRY_CODE } from "@/features/auth/validations";
import { sanitizeNationalPhoneInput } from "@/lib/phone";

/** Digits only, max 10 — matches locked dial-code mobile. */
export function sanitizeIndianMobileInput(raw: string): string {
  return sanitizeNationalPhoneInput(raw);
}

type IndianMobileFieldProps<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
  /** Override store/register dial code (default +91). */
  countryCode?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: ReactNode;
} & Omit<
  TextFieldProps,
  "name" | "value" | "onChange" | "error" | "helperText" | "type"
>;

export function IndianMobileField<T extends FieldValues>({
  name,
  control,
  countryCode = REGISTER_COUNTRY_CODE,
  disabled,
  error,
  helperText,
  ...textFieldProps
}: IndianMobileFieldProps<T>) {
  const code = countryCode.trim() || REGISTER_COUNTRY_CODE;

  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-3">
      <TextField
        label="Code"
        value={code}
        fullWidth
        disabled
        slotProps={{
          htmlInput: { readOnly: true, "aria-label": "Country code" },
        }}
      />
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <TextField
            {...textFieldProps}
            label={textFieldProps.label ?? "Account number"}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="9876543210"
            fullWidth
            disabled={disabled}
            error={error}
            helperText={helperText ?? "Enter your 10-digit account number"}
            value={field.value ?? ""}
            onBlur={field.onBlur}
            name={field.name}
            inputRef={field.ref}
            onChange={(e) => {
              field.onChange(sanitizeIndianMobileInput(e.target.value));
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
