"use client";

import TextField from "@mui/material/TextField";
import { useEffect, useState } from "react";
import {
  buildSeoDescription,
  buildSeoTitle,
  shouldKeepAutoSeo,
} from "@/features/seo/auto-seo";
import { GoogleSeoPreview } from "@/features/seo/components/GoogleSeoPreview";
import { adminBtn, adminStackStyle } from "@/features/admin/ui/admin-classes";

/**
 * Google / SEO fields that auto-fill from a page/product/category name + blurb.
 * Stays locked (disabled) while matching auto values; unlock to customize.
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
  /** Always use automatic title/description — no Customize control. */
  forceAutomatic = false,
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
  forceAutomatic?: boolean;
}) {
  const autoTitle = buildSeoTitle(sourceTitle);
  const autoDescription = buildSeoDescription(
    sourceDescription || sourceTitle,
  );

  const [titleForcedManual, setTitleForcedManual] = useState(false);
  const [descriptionForcedManual, setDescriptionForcedManual] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [seenResetKey, setSeenResetKey] = useState(resetKey);

  if (seenResetKey !== resetKey) {
    setSeenResetKey(resetKey);
    setTitleForcedManual(false);
    setDescriptionForcedManual(false);
    setCustomizeOpen(false);
  }

  const titleLooksManual =
    !forceAutomatic &&
    seoTitle.trim() !== "" &&
    !shouldKeepAutoSeo(seoTitle, autoTitle);
  const descriptionLooksManual =
    !forceAutomatic &&
    seoDescription.trim() !== "" &&
    !shouldKeepAutoSeo(seoDescription, autoDescription);

  const titleManual = !forceAutomatic && (titleForcedManual || titleLooksManual);
  const descriptionManual =
    !forceAutomatic && (descriptionForcedManual || descriptionLooksManual);
  const isCustomized = titleManual || descriptionManual || customizeOpen;
  const fieldsLocked = forceAutomatic || !isCustomized;

  useEffect(() => {
    if (titleManual) return;
    if (autoTitle !== seoTitle) onSeoTitleChange(autoTitle);
  }, [autoTitle, seoTitle, titleManual, onSeoTitleChange]);

  useEffect(() => {
    if (descriptionManual) return;
    if (autoDescription !== seoDescription) {
      onSeoDescriptionChange(autoDescription);
    }
  }, [
    autoDescription,
    seoDescription,
    descriptionManual,
    onSeoDescriptionChange,
  ]);

  const previewTitle = seoTitle.trim() || autoTitle || sourceTitle;
  const previewDescription =
    seoDescription.trim() || autoDescription || sourceDescription;

  return (
    <div style={adminStackStyle}>
      <p className="text-sm text-[var(--color-muted)]">
        {forceAutomatic
          ? "Search text is filled automatically from the page title and document body. It cannot be customized for legal pages."
          : "This is what Google (and similar search engines) can show for this page. It is filled automatically from the title and summary above — leave it alone unless you need different search text."}
      </p>
      {!forceAutomatic ? (
        <div className="flex flex-wrap items-center gap-2">
          {fieldsLocked ? (
            <button
              type="button"
              className={adminBtn("outline")}
              disabled={disabled}
              onClick={() => setCustomizeOpen(true)}
            >
              Customize for Google
            </button>
          ) : (
            <button
              type="button"
              className={adminBtn("ghost")}
              disabled={disabled}
              onClick={() => {
                setCustomizeOpen(false);
                setTitleForcedManual(false);
                setDescriptionForcedManual(false);
                onSeoTitleChange(autoTitle);
                onSeoDescriptionChange(autoDescription);
              }}
            >
              Use automatic text
            </button>
          )}
          <span className="text-xs text-[var(--color-muted)]">
            {fieldsLocked ? "Using title & summary" : "Custom search text"}
          </span>
        </div>
      ) : (
        <p className="text-xs font-medium text-[var(--color-muted)]">
          Using automatic text from title &amp; body
        </p>
      )}
      <TextField
        label={titleLabel}
        fullWidth
        size="small"
        disabled={disabled || fieldsLocked}
        value={seoTitle}
        onChange={(event) => {
          setTitleForcedManual(true);
          onSeoTitleChange(event.target.value);
        }}
        helperText={
          titleManual
            ? `${seoTitle.length}/60 · Customized`
            : `${seoTitle.length}/60 · Auto from title`
        }
      />
      <TextField
        label={descriptionLabel}
        fullWidth
        size="small"
        multiline
        minRows={2}
        disabled={disabled || fieldsLocked}
        value={seoDescription}
        onChange={(event) => {
          setDescriptionForcedManual(true);
          onSeoDescriptionChange(event.target.value);
        }}
        helperText={
          descriptionManual
            ? `${seoDescription.length}/155 · Customized`
            : `${seoDescription.length}/155 · Auto from summary`
        }
      />
      <GoogleSeoPreview
        title={previewTitle}
        description={previewDescription}
        url={previewUrl}
      />
    </div>
  );
}
