"use client";

import TextField from "@mui/material/TextField";
import { useEffect, useRef } from "react";
import {
  buildSeoDescription,
  buildSeoTitle,
  shouldKeepAutoSeo,
} from "@/features/seo/auto-seo";
import { GoogleSeoPreview } from "@/features/seo/components/GoogleSeoPreview";
import { adminStackStyle } from "@/features/admin/ui/admin-classes";

/**
 * Google / SEO fields that auto-fill from a page/product/category name + blurb.
 * Stops overwriting a field once the merchant edits it away from the auto value.
 */
export function AdminSeoFields({
  sourceTitle,
  sourceDescription,
  seoTitle,
  seoDescription,
  onSeoTitleChange,
  onSeoDescriptionChange,
  previewUrl,
  disabled,
  titleLabel = "Google title",
  descriptionLabel = "Google description",
  /** Change this when switching edit targets so auto-fill unlocks again. */
  resetKey,
}: {
  sourceTitle: string;
  sourceDescription: string;
  seoTitle: string;
  seoDescription: string;
  onSeoTitleChange: (value: string) => void;
  onSeoDescriptionChange: (value: string) => void;
  previewUrl: string;
  disabled?: boolean;
  titleLabel?: string;
  descriptionLabel?: string;
  resetKey?: string | number | null;
}) {
  const titleManual = useRef(false);
  const descriptionManual = useRef(false);
  const autoTitle = buildSeoTitle(sourceTitle);
  const autoDescription = buildSeoDescription(
    sourceDescription || sourceTitle,
  );

  useEffect(() => {
    titleManual.current = false;
    descriptionManual.current = false;
  }, [resetKey]);

  useEffect(() => {
    if (titleManual.current) return;
    if (!shouldKeepAutoSeo(seoTitle, autoTitle) && seoTitle.trim()) {
      titleManual.current = true;
      return;
    }
    if (autoTitle !== seoTitle) onSeoTitleChange(autoTitle);
  }, [autoTitle, seoTitle, onSeoTitleChange]);

  useEffect(() => {
    if (descriptionManual.current) return;
    if (
      !shouldKeepAutoSeo(seoDescription, autoDescription) &&
      seoDescription.trim()
    ) {
      descriptionManual.current = true;
      return;
    }
    if (autoDescription !== seoDescription) {
      onSeoDescriptionChange(autoDescription);
    }
  }, [autoDescription, seoDescription, onSeoDescriptionChange]);

  const previewTitle = seoTitle.trim() || autoTitle || sourceTitle;
  const previewDescription =
    seoDescription.trim() || autoDescription || sourceDescription;

  return (
    <div style={adminStackStyle}>
      <p className="text-sm text-[var(--color-muted)]">
        Filled automatically from the name and description. Edit only if you
        want different search text.
      </p>
      <TextField
        label={titleLabel}
        fullWidth
        disabled={disabled}
        value={seoTitle}
        onChange={(event) => {
          titleManual.current = true;
          onSeoTitleChange(event.target.value);
        }}
        helperText={
          titleManual.current
            ? `${seoTitle.length}/60 · Customized`
            : `${seoTitle.length}/60 · Auto from name`
        }
      />
      <TextField
        label={descriptionLabel}
        fullWidth
        multiline
        minRows={2}
        disabled={disabled}
        value={seoDescription}
        onChange={(event) => {
          descriptionManual.current = true;
          onSeoDescriptionChange(event.target.value);
        }}
        helperText={
          descriptionManual.current
            ? `${seoDescription.length}/155 · Customized`
            : `${seoDescription.length}/155 · Auto from description`
        }
      />
      <GoogleSeoPreview
        title={previewTitle}
        url={previewUrl}
        description={previewDescription}
      />
    </div>
  );
}
