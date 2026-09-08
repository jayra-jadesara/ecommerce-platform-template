"use client";

import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import type { ContentSection } from "@/features/cms/types";
import {
  isSupportedSectionType,
  parseSectionConfig,
  SECTION_TYPE_LABELS,
} from "@/features/cms/schemas";

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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Homepage preview</DialogTitle>
      <DialogContent dividers>
        <p className="mb-4 text-sm text-[var(--color-muted)]">
          Preview uses your current unsaved editor state where possible. Publishing
          is still required to update the live storefront.
        </p>
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
                    <>
                      <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]">
                        {(parsed.config as { description?: string }).description}
                      </p>
                      {(parsed.config as { enable3d?: boolean }).enable3d ? (
                        <p className="mt-1 text-xs text-[var(--color-muted)]">
                          3D scene:{" "}
                          {String(
                            (parsed.config as { scene3dPreset?: string })
                              .scene3dPreset ?? "NONE",
                          )}{" "}
                          (preview only — live store needs Appearance → 3D
                          enabled)
                        </p>
                      ) : null}
                    </>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
