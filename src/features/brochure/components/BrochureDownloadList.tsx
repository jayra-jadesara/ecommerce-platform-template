"use client";

import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import type { StorefrontBrochure } from "@/features/brochure/types";
import { sfBtn, sfCard } from "@/components/ui/storefront-classes";
import { cn } from "@/lib/cn";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type BrochureDownloadListProps = {
  brochures: StorefrontBrochure[];
};

export function BrochureDownloadList({ brochures }: BrochureDownloadListProps) {
  if (!brochures.length) {
    return (
      <p className="mt-8 text-center text-sm text-[var(--color-muted)]">
        No brochures available yet. Please check back soon.
      </p>
    );
  }

  return (
    <ul className="mx-auto mt-8 max-w-2xl space-y-3">
      {brochures.map((item) => {
        const sizeLabel = formatBytes(item.fileSizeBytes);
        return (
          <li key={item.id}>
            <div
              className={cn(
                sfCard(),
                "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-default,0.5rem)] bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface))] text-[var(--color-primary)]">
                  <PictureAsPdfOutlinedIcon sx={{ fontSize: 22 }} />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-[var(--color-foreground)]">
                    {item.title}
                  </p>
                  {sizeLabel ? (
                    <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                      PDF · {sizeLabel}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-sm text-[var(--color-muted)]">PDF</p>
                  )}
                </div>
              </div>
              <a
                href={`/api/brochure/${item.id}/download`}
                className={cn(sfBtn("primary"), "shrink-0 !min-h-10")}
                download
              >
                Download
              </a>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
