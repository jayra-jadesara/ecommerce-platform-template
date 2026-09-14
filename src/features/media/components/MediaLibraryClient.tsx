"use client";

import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  checkMediaDependenciesAction,
  deleteMediaAction,
  uploadMediaAction,
} from "@/features/media/actions";
import { MediaFolderNav } from "@/features/media/components/MediaFolderNav";
import { UploadDropzone } from "@/features/media/components/UploadDropzone";
import type { MediaRow } from "@/features/media/media-service";
import {
  MEDIA_FOLDER_HINTS,
  mediaFolderLabel,
  resolveMediaUploadFolder,
  type MediaFolderFilter,
} from "@/features/media/media-folder-labels";
import type { MediaFolder } from "@/features/media/validation";
import { getAdminPath } from "@/config/admin-route";
import { ConfirmDeleteDialog } from "@/features/admin/ui/ConfirmDeleteDialog";
import {
  adminBtn,
  adminCard,
} from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";

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
  // Keep filter inputs aligned with URL search params without an effect.
  const [filterQ, setFilterQ] = useState(q);
  const [urlQ, setUrlQ] = useState(q);
  const [deleteTarget, setDeleteTarget] = useState<MediaRow | null>(null);
  const [deleteBlocked, setDeleteBlocked] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  if (urlQ !== q) {
    setUrlQ(q);
    setFilterQ(q);
  }

  const uploadFolder = resolveMediaUploadFolder(folder);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const items = useMemo(() => initialItems, [initialItems]);
  const activeFolder: MediaFolderFilter = folder;

  function navigateFolder(next: MediaFolderFilter) {
    router.push(buildHref({ q: filterQ, folder: next, page: 1 }));
  }

  function openDelete(item: MediaRow) {
    setError(null);
    setDeleteTarget(item);
    setDeleteBlocked(false);
    setDeleteMessage(`Delete “${item.file_name}”? This cannot be undone.`);
    startTransition(async () => {
      const check = await checkMediaDependenciesAction(item.id);
      if (!check.ok) {
        setError(check.error);
        setDeleteTarget(null);
        return;
      }
      if (!check.deps.canDelete) {
        setDeleteBlocked(true);
        setDeleteMessage(check.deps.message);
      }
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[4.75rem_minmax(0,1fr)] lg:items-start">
      <aside
        className={cn(
          adminCard(),
          "flex flex-col items-center gap-2 p-2 lg:sticky lg:top-4 lg:self-start",
        )}
      >
        <p className="sr-only">Categories</p>
        <MediaFolderNav
          active={activeFolder}
          onSelect={navigateFolder}
        />
        <p className="hidden border-t border-[var(--color-border)] px-1 pt-2 text-center text-[10px] leading-snug text-[var(--color-muted)] xl:block">
          {activeFolder === "all"
            ? "Uploads go to Homepage & pages."
            : MEDIA_FOLDER_HINTS[activeFolder]}
        </p>
      </aside>

      <div className="min-w-0 space-y-4">
        {canUpload ? (
          <div className={`${adminCard()} p-3 sm:p-4`}>
            <UploadDropzone
              disabled={pending}
              label="Drop images here"
              hint={`Saved to ${mediaFolderLabel(uploadFolder)} · JPEG, PNG, or WebP · max 5 MB each`}
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
          </div>
        ) : null}

        <form
          className={`${adminCard()} flex flex-col gap-2 p-3 sm:flex-row sm:items-end`}
          onSubmit={(event) => {
            event.preventDefault();
            router.push(
              buildHref({
                q: filterQ,
                folder: activeFolder,
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
          <button type="submit" className={adminBtn("outline")}>
            Search
          </button>
        </form>

        {error ? <Alert severity="error">{error}</Alert> : null}
        {success ? <Alert severity="success">{success}</Alert> : null}

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)] px-4 py-12 text-center">
            <p className="text-sm font-medium text-[var(--color-foreground)]">
              No images yet
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Upload to this folder, or pick another category on the left.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((item) => {
              const url = item.preview_url || null;
              return (
                <li
                  key={item.id}
                  className={`${adminCard()} overflow-hidden`}
                >
                  <div className="relative aspect-square bg-[var(--color-surface)] p-1.5">
                    {url ? (
                      // Signed private URLs must not go through next/image optimizer.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={item.alt_text || item.file_name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-[var(--color-muted)]">
                        {item.file_name}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5 border-t border-[var(--color-border)] p-2">
                    <p
                      className="truncate text-[11px] font-medium leading-tight text-[var(--color-foreground)]"
                      title={item.file_name}
                    >
                      {item.file_name}
                    </p>
                    <p className="truncate text-[10px] text-[var(--color-muted)]">
                      {mediaFolderLabel(item.folder)}
                      {item.file_size ? ` · ${formatBytes(item.file_size)}` : ""}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        className="rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] font-medium hover:border-[var(--color-primary)]"
                        onClick={async () => {
                          await navigator.clipboard.writeText(item.storage_path);
                          setSuccess("Path copied.");
                        }}
                      >
                        Path
                      </button>
                      {url ? (
                        <button
                          type="button"
                          className="rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] font-medium hover:border-[var(--color-primary)]"
                          onClick={async () => {
                            await navigator.clipboard.writeText(url);
                            setSuccess("Link copied.");
                          }}
                        >
                          Link
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="rounded border border-red-200 px-1.5 py-0.5 text-[10px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                        disabled={!canDelete || pending}
                        onClick={() => openDelete(item)}
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

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title={deleteBlocked ? "Can't delete this image" : "Delete image?"}
        message={deleteMessage}
        blocked={deleteBlocked}
        warningTone={deleteBlocked}
        pending={pending}
        onClose={() => {
          if (pending) return;
          setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (!deleteTarget) return;
          startTransition(async () => {
            const result = await deleteMediaAction(deleteTarget.id);
            if (!result.ok) {
              setError(result.error);
              setDeleteTarget(null);
              return;
            }
            setSuccess("Image deleted.");
            setDeleteTarget(null);
            router.refresh();
          });
        }}
      />
    </div>
  );
}
