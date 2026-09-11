"use client";

import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  deleteMediaAction,
  uploadMediaAction,
} from "@/features/media/actions";
import { UploadDropzone } from "@/features/media/components/UploadDropzone";
import type { MediaRow } from "@/features/media/media-service";
import { MEDIA_FOLDERS, type MediaFolder } from "@/features/media/validation";
import { getAdminPath } from "@/config/admin-route";
import {
  adminBtn,
  adminCard,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";

interface MediaLibraryClientProps {
  initialItems: MediaRow[];
  total: number;
  page: number;
  pageSize: number;
  folder: MediaFolder | "all";
  q: string;
  canUpload: boolean;
  canDelete: boolean;
}

const FOLDER_LABELS: Record<MediaFolder, string> = {
  general: "General library",
  cms: "Homepage & pages",
  products: "Products",
  categories: "Categories",
  branding: "Logo & branding",
};

const FOLDER_HINTS: Record<MediaFolder, string> = {
  general: "Private admin library — use signed previews in admin only.",
  cms: "Best for banners and homepage images (public on the store).",
  products: "Product photos",
  categories: "Category images",
  branding: "Logo, favicon, social image",
};

function buildHref(input: {
  page?: number;
  folder?: string;
  q?: string;
}) {
  const params = new URLSearchParams();
  if (input.q) params.set("q", input.q);
  if (input.folder && input.folder !== "all") params.set("folder", input.folder);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const qs = params.toString();
  return `${getAdminPath("/media")}${qs ? `?${qs}` : ""}`;
}

function formatBytes(size: number | null): string {
  if (size == null || size <= 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaLibraryClient({
  initialItems,
  total,
  page,
  pageSize,
  folder,
  q,
  canUpload,
  canDelete,
}: MediaLibraryClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploadFolder, setUploadFolder] = useState<MediaFolder>(
    folder === "all" ? "cms" : folder,
  );
  const [filterQ, setFilterQ] = useState(q);
  const [filterFolder, setFilterFolder] = useState<MediaFolder | "all">(folder);
  const [urlFilters, setUrlFilters] = useState({ q, folder });

  // Keep draft inputs aligned when the URL/search params change (back/forward).
  if (urlFilters.q !== q || urlFilters.folder !== folder) {
    setUrlFilters({ q, folder });
    setFilterQ(q);
    setFilterFolder(folder);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const items = useMemo(() => initialItems, [initialItems]);

  return (
    <div style={adminStackStyle}>
      <div
        className={`${adminCard()} p-4 md:p-5`}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <div>
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            Upload images
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Choose where the file belongs, then upload. For storefront banners
            and homepage, prefer <strong>Homepage &amp; pages</strong>.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
          <UploadDropzone
            disabled={!canUpload || pending}
            label="Drop images here"
            hint="JPEG, PNG, or WEBP · up to 10 MB each"
            onFiles={async (files) => {
              setError(null);
              setSuccess(null);
              for (const file of files) {
                const formData = new FormData();
                formData.set("file", file);
                formData.set("folder", uploadFolder);
                const result = await uploadMediaAction(formData);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
              }
              setSuccess(
                files.length === 1
                  ? "Image uploaded."
                  : `${files.length} images uploaded.`,
              );
              router.refresh();
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <TextField
              select
              label="Save into"
              value={uploadFolder}
              required
              disabled={!canUpload}
              helperText={FOLDER_HINTS[uploadFolder]}
              onChange={(event) =>
                setUploadFolder(event.target.value as MediaFolder)
              }
            >
              {MEDIA_FOLDERS.map((value) => (
                <MenuItem key={value} value={value}>
                  {FOLDER_LABELS[value]}
                </MenuItem>
              ))}
            </TextField>
          </div>
        </div>
      </div>

      <form
        className={`${adminCard()} flex flex-col gap-3 p-4 sm:flex-row sm:items-end`}
        onSubmit={(event) => {
          event.preventDefault();
          router.push(
            buildHref({
              q: filterQ,
              folder: filterFolder,
              page: 1,
            }),
          );
        }}
      >
        <TextField
          label="Search by name"
          size="small"
          value={filterQ}
          onChange={(event) => setFilterQ(event.target.value)}
          fullWidth
        />
        <TextField
          select
          label="Folder"
          size="small"
          value={filterFolder}
          onChange={(event) =>
            setFilterFolder(event.target.value as MediaFolder | "all")
          }
          className="min-w-48"
        >
          <MenuItem value="all">All folders</MenuItem>
          {MEDIA_FOLDERS.map((value) => (
            <MenuItem key={value} value={value}>
              {FOLDER_LABELS[value]}
            </MenuItem>
          ))}
        </TextField>
        <button type="submit" className={adminBtn("outline")}>
          Apply
        </button>
      </form>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)] px-4 py-14 text-center">
          <p className="text-sm font-medium text-[var(--color-foreground)]">
            No images yet
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Upload product photos, banners, or brand assets to use across your
            store.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => {
            const url = item.preview_url || null;
            const folderKey = (item.folder || "general") as MediaFolder;
            const folderLabel =
              FOLDER_LABELS[folderKey] ?? item.folder ?? "General";
            return (
              <li key={item.id} className={`${adminCard()} overflow-hidden`}>
                <div className="relative aspect-[4/3] bg-[var(--color-surface)]">
                  {url ? (
                    // Signed private URLs must not go through next/image optimizer.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt={item.alt_text || item.file_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center">
                      <p className="text-sm font-medium text-[var(--color-foreground)]">
                        Preview unavailable
                      </p>
                      <p className="text-xs text-[var(--color-muted)]">
                        {item.file_name}
                      </p>
                    </div>
                  )}
                </div>
                <div
                  className="p-3"
                  style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
                >
                  <div>
                    <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
                      {item.file_name}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                      {folderLabel}
                      {item.file_size ? ` · ${formatBytes(item.file_size)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={adminBtn("outline")}
                      onClick={async () => {
                        await navigator.clipboard.writeText(item.storage_path);
                        setSuccess("Path copied — paste this in image fields.");
                      }}
                    >
                      Copy path
                    </button>
                    {url ? (
                      <button
                        type="button"
                        className={adminBtn("ghost")}
                        onClick={async () => {
                          await navigator.clipboard.writeText(url);
                          setSuccess("Preview link copied.");
                        }}
                      >
                        Copy link
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={adminBtn("danger")}
                      disabled={!canDelete || pending}
                      onClick={() => {
                        if (!window.confirm("Delete this image?")) return;
                        startTransition(async () => {
                          const result = await deleteMediaAction(item.id);
                          if (!result.ok) {
                            setError(result.error);
                            return;
                          }
                          setSuccess("Image deleted.");
                          router.refresh();
                        });
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="text-[var(--color-muted)]">
          {total} image{total === 1 ? "" : "s"} · page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <a
            className={`${adminBtn("outline")} ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
            href={buildHref({ q, folder, page: page - 1 })}
            aria-disabled={page <= 1}
          >
            Previous
          </a>
          <a
            className={`${adminBtn("outline")} ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
            href={buildHref({ q, folder, page: page + 1 })}
            aria-disabled={page >= totalPages}
          >
            Next
          </a>
        </div>
      </div>
    </div>
  );
}
