"use client";

import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import type { ReactNode } from "react";

type AdminToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
  className?: string;
};

/** Reusable admin on/off control (MUI Switch + label). */
export function AdminToggle({
  checked,
  onChange,
  label,
  disabled = false,
  className,
}: AdminToggleProps) {
  return (
    <FormControlLabel
      className={className}
      disabled={disabled}
      control={
        <Switch
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          color="primary"
          size="small"
        />
      }
      label={label}
    />
  );
}
