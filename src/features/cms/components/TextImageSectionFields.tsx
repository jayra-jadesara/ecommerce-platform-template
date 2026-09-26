"use client";

import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import { adminFieldGroup } from "@/features/admin/ui/admin-classes";
import {
  pageOptionLabel,
  StorePageLinkField,
} from "@/features/admin/ui/StorePageLinkField";
import { IMAGE_FRAME_STYLES, type ImageFrameStyle } from "@/features/cms/schemas";
import { ImageField } from "@/features/cms/components/ImageField";

const FRAME_LABELS: Record<ImageFrameStyle, string> = {
  plain: "No border, no shadow",
  border: "Border only",
  shadow: "Shadow only",
  elevated: "Border + shadow",
};

type Props = {
  heading: string;
  description: string;
  imagePath: string | null;
  imagePosition: "left" | "right";
  imageFrameStyle: ImageFrameStyle;
  showButton: boolean;
  buttonText: string;
  buttonLink: string | null;
  onChange: (patch: Record<string, unknown>) => void;
  onPickMedia: () => void;
};

export function TextImageSectionFields({
  heading,
  description,
  imagePath,
  imagePosition,
  imageFrameStyle,
  showButton,
  buttonText,
  buttonLink,
  onChange,
  onPickMedia,
}: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
      <div className={adminFieldGroup(true)}>
        <p className="admin-field-group__title">1. Content</p>
        <p className="admin-field-group__hint">
          Heading, story, and image — preview updates as you type.
        </p>
        <TextField
          label="Heading"
          fullWidth
          size="small"
          value={heading}
          onChange={(e) => onChange({ heading: e.target.value })}
          placeholder="e.g. Our story"
        />
        <TextField
          label="Description"
          fullWidth
          size="small"
          multiline
          minRows={2}
          maxRows={5}
          value={description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Short story for shoppers."
        />
        <ImageField
          label="Image"
          value={imagePath}
          onPick={onPickMedia}
          onClear={() => onChange({ imagePath: null })}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <TextField
            select
            label="Image position"
            fullWidth
            size="small"
            value={imagePosition}
            onChange={(e) =>
              onChange({ imagePosition: e.target.value as "left" | "right" })
            }
          >
            <MenuItem value="left">Left</MenuItem>
            <MenuItem value="right">Right</MenuItem>
          </TextField>
          <TextField
            select
            label="Image frame"
            fullWidth
            size="small"
            value={imageFrameStyle}
            onChange={(e) =>
              onChange({
                imageFrameStyle: e.target.value as ImageFrameStyle,
              })
            }
            helperText="Use plain for transparent PNGs"
          >
            {IMAGE_FRAME_STYLES.map((style) => (
              <MenuItem key={style} value={style}>
                {FRAME_LABELS[style]}
              </MenuItem>
            ))}
          </TextField>
        </div>
      </div>

      <div className={adminFieldGroup(true)}>
        <p className="admin-field-group__title">2. Button</p>
        <p className="admin-field-group__hint">
          Optional CTA under the story — turn off if you do not want a button.
        </p>
        <AdminToggle
          variant="row"
          checked={showButton}
          onChange={(checked) => {
            onChange({
              showButton: checked,
              ...(checked && !buttonLink ? { buttonLink: "/products" } : {}),
            });
          }}
          label="Show button on store"
          description="When off, shoppers will not see a CTA on this block."
        />
        {showButton ? (
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
              placeholder="e.g. Shop products"
            />
            <StorePageLinkField
              value={buttonLink}
              fallback="/products"
              onChange={(v) => onChange({ buttonLink: v })}
              helperText={
                buttonText.trim()
                  ? `Opens ${pageOptionLabel(String(buttonLink ?? "/products"))}`
                  : "Pick where the button should send shoppers"
              }
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
