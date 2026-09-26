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
  plain: "Section plane (recommended)",
  border: "Border only",
  shadow: "Shadow only",
  elevated: "Border + shadow",
};

type Props = {
  title: string;
  description: string;
  imagePath: string | null;
  imageFrameStyle: ImageFrameStyle;
  alignment: "left" | "center" | "right";
  overlayStyle: "none" | "soft" | "strong";
  showButton: boolean;
  buttonText: string;
  link: string | null;
  onChange: (patch: Record<string, unknown>) => void;
  onPickMedia: () => void;
};

export function BannerSectionFields({
  title,
  description,
  imagePath,
  imageFrameStyle,
  alignment,
  overlayStyle,
  showButton,
  buttonText,
  link,
  onChange,
  onPickMedia,
}: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
      <div className={adminFieldGroup(true)}>
        <p className="admin-field-group__title">1. Banner content</p>
        <p className="admin-field-group__hint">
          Title and copy sit on the image — preview matches the storefront.
        </p>
        <TextField
          label="Banner title"
          fullWidth
          size="small"
          value={title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g. Seasonal collection"
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
          placeholder="Optional line under the title."
        />
        <ImageField
          label="Banner image"
          value={imagePath}
          onPick={onPickMedia}
          onClear={() => onChange({ imagePath: null })}
        />
        <TextField
          select
          label="Image frame"
          fullWidth
          size="small"
          value={imageFrameStyle}
          onChange={(e) =>
            onChange({ imageFrameStyle: e.target.value as ImageFrameStyle })
          }
          helperText="Plain aligns with other sections (no floating card)"
        >
          {IMAGE_FRAME_STYLES.map((style) => (
            <MenuItem key={style} value={style}>
              {FRAME_LABELS[style]}
            </MenuItem>
          ))}
        </TextField>
        <div className="grid gap-2 sm:grid-cols-2">
          <TextField
            select
            label="Text alignment"
            fullWidth
            size="small"
            value={alignment}
            onChange={(e) =>
              onChange({
                alignment: e.target.value as "left" | "center" | "right",
              })
            }
          >
            <MenuItem value="left">Left</MenuItem>
            <MenuItem value="center">Center</MenuItem>
            <MenuItem value="right">Right</MenuItem>
          </TextField>
          <TextField
            select
            label="Image overlay"
            fullWidth
            size="small"
            value={overlayStyle}
            onChange={(e) =>
              onChange({
                overlayStyle: e.target.value as "none" | "soft" | "strong",
              })
            }
          >
            <MenuItem value="none">None</MenuItem>
            <MenuItem value="soft">Soft</MenuItem>
            <MenuItem value="strong">Strong</MenuItem>
          </TextField>
        </div>
      </div>

      <div className={adminFieldGroup(true)}>
        <p className="admin-field-group__title">2. Button</p>
        <p className="admin-field-group__hint">
          Optional CTA on the banner — turn off if you do not want a button.
        </p>
        <AdminToggle
          variant="row"
          checked={showButton}
          onChange={(checked) => {
            onChange({
              showButton: checked,
              ...(checked && !link ? { link: "/products" } : {}),
            });
          }}
          label="Show button on store"
          description="When off, shoppers will not see a CTA on this banner."
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
              placeholder="e.g. Shop now"
            />
            <StorePageLinkField
              value={link}
              fallback="/products"
              onChange={(v) => onChange({ link: v })}
              helperText={
                buttonText.trim()
                  ? `Opens ${pageOptionLabel(String(link ?? "/products"))}`
                  : "Pick where the button should send shoppers"
              }
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
