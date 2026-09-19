"use client";

import TextField from "@mui/material/TextField";
import { adminFieldGroup } from "@/features/admin/ui/admin-classes";
import {
  pageOptionLabel,
  StorePageLinkField,
} from "@/features/admin/ui/StorePageLinkField";

type Props = {
  heading: string;
  description: string;
  buttonText: string;
  buttonLink: string | null;
  onChange: (patch: {
    heading?: string;
    description?: string;
    buttonText?: string;
    buttonLink?: string | null;
  }) => void;
};

export function CtaSectionFields({
  heading,
  description,
  buttonText,
  buttonLink,
  onChange,
}: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
      <div className={adminFieldGroup(true)}>
        <p className="admin-field-group__title">1. Message</p>
        <p className="admin-field-group__hint">
          Heading and short copy — preview updates as you type.
        </p>
        <TextField
          label="Heading"
          fullWidth
          size="small"
          value={heading}
          onChange={(e) => onChange({ heading: e.target.value })}
          placeholder="e.g. Need more info?"
        />
        <TextField
          label="Description"
          fullWidth
          size="small"
          multiline
          minRows={2}
          maxRows={4}
          value={description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="One or two sentences for shoppers."
        />
      </div>

      <div className={adminFieldGroup(true)}>
        <p className="admin-field-group__title">2. Button</p>
        <p className="admin-field-group__hint">
          Label and destination. Leave text blank to hide the button.
        </p>
        <div
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-2.5"
          style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}
        >
          <TextField
            label="Button text"
            fullWidth
            size="small"
            value={buttonText}
            onChange={(e) => onChange({ buttonText: e.target.value })}
            placeholder="e.g. Contact us"
          />
          <StorePageLinkField
            value={buttonLink}
            fallback="/contact"
            onChange={(v) => onChange({ buttonLink: v })}
            helperText={
              buttonText.trim()
                ? `Opens ${pageOptionLabel(String(buttonLink ?? "/contact"))}`
                : "Pick where the button should send shoppers"
            }
          />
        </div>
      </div>
    </div>
  );
}
