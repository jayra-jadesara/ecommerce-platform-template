"use client";

import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField, { type TextFieldProps } from "@mui/material/TextField";
import { useState } from "react";

type PasswordFieldProps = Omit<TextFieldProps, "type">;

/** TextField with show/hide password toggle. */
export function PasswordField({
  slotProps,
  disabled,
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  const inputSlot =
    slotProps && typeof slotProps === "object" && "input" in slotProps
      ? (slotProps.input as Record<string, unknown> | undefined)
      : undefined;

  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      disabled={disabled}
      slotProps={{
        ...slotProps,
        input: {
          ...inputSlot,
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={visible ? "Hide password" : "Show password"}
                onClick={() => setVisible((v) => !v)}
                edge="end"
                disabled={disabled}
                size="small"
                tabIndex={-1}
                disableFocusRipple
              >
                {visible ? (
                  <VisibilityOff fontSize="small" />
                ) : (
                  <Visibility fontSize="small" />
                )}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
