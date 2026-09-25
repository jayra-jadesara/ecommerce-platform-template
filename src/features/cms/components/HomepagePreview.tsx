"use client";

import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import type { ContentSection } from "@/features/cms/types";
import {
  isSupportedSectionType,
  parseSectionConfig,
  SECTION_TYPE_LABELS,
} from "@/features/cms/schemas";
import { AdminDialog } from "@/features/admin/ui/AdminDialog";
import { adminBtn } from "@/features/admin/ui/admin-classes";

/**
 * In-memory admin preview — does not write to the database.
 * Shows section order/labels and key config fields for a quick check before publish.
 */
export function HomepagePreview({
  open,
  onClose,
  sections,
}: {
  open: boolean;
  onClose: () => void;
  sections: ContentSection[];
}) {
  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      title="Homepage preview"
      description="Uses your current editor state. Publish to update the live storefront."
      maxWidth="md"
      icon={<VisibilityOutlinedIcon sx={{ fontSize: 22 }} />}
      actions={
        <button type="button" onClick={onClose} className={adminBtn("secondary")}>
          Close
        </button>
      }
    >
      {sections.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No sections to preview.</p>
      ) : (
        <ol className="space-y-3">
          {sections.map((section, index) => {
            const parsed = parseSectionConfig(section.sectionType, section.config);
            const label = isSupportedSectionType(section.sectionType)
              ? SECTION_TYPE_LABELS[section.sectionType]
              : section.sectionType;
            const title =
              section.title ||
              (parsed.ok
                ? String(
                    (parsed.config as { title?: string; heading?: string }).title ??
                      (parsed.config as { heading?: string }).heading ??
                      "",
                  )
                : "");
            return (
              <li
                key={section.id}
                className={`rounded-xl border px-4 py-3 ${
                  section.isActive
                    ? "border-[var(--color-border)] bg-[var(--color-card)]"
                    : "border-dashed border-[var(--color-border)] opacity-60"
                }`}
              >
                <p className="text-xs text-[var(--color-muted)]">
                  {index + 1}. {label} · {section.isActive ? "Visible" : "Hidden"}
                </p>
                <p className="mt-1 font-medium">{title || label}</p>
                {!parsed.ok ? (
                  <p className="mt-1 text-sm text-red-700">
                    This section has invalid settings and will not render live.
                  </p>
                ) : null}
                {parsed.ok && section.sectionType === "hero" ? (
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]">
                    {(parsed.config as { description?: string }).description}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </AdminDialog>
  );
}
