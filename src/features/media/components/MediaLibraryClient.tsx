"use client";

import CloseIcon from "@mui/icons-material/Close";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  checkMediaDependenciesAction,
  deleteMediaAction,
  deleteMediaBulkAction,
  uploadMediaAction,
} from "@/features/media/actions";
import { MediaAssetTile } from "@/features/media/components/MediaAssetTile";
import { MediaFolderNav } from "@/features/media/components/MediaFolderNav";
import { UploadDropzone } from "@/features/media/components/UploadDropzone";
import type { MediaRow } from "@/features/media/media-service";
import {
  MEDIA_FOLDER_HINTS,
  MEDIA_FOLDER_NAV,
  mediaFolderHint,
  mediaFolderLabel,
  mediaFolderLibraryDescription,
  resolveMediaUploadFolder,
  type MediaFolderFilter,
} from "@/features/media/media-folder-labels";
import type { MediaFolder } from "@/features/media/validation";
import { getAdminPath } from "@/config/admin-route";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import { ConfirmDeleteDialog } from "@/features/admin/ui/ConfirmDeleteDialog";
import { adminBtn, adminCard } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";

const PAGE_SIZE_OPTIONS = [
  { value: "24", label: "24" },
  { value: "48", label: "48" },
] as const;

const DEFAULT_PAGE_SIZE = 24;

const FOLDER_SELECT_OPTIONS = MEDIA_FOLDER_NAV.map((entry) => ({
  value: entry.id,
  label: entry.label,
}));

const pagerBtn =
  "inline-flex h-7 min-w-7 items-center justify-center rounded-lg border px-2 text-[11px] font-semibold transition disabled:opacity-35";

interface MediaLibraryClientProps {
  initialItems: MediaRow[];
  total: number;
  page: number;
  pageSize: number;
  folder: MediaFolder | "all";
  q: string;
  canUpload: boolean;
  canDelete: boolean;
  /** Admin-configured max upload size in MB. */
  adminImageMaxMb?: number;
}

function buildPageItems(
  current: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);

  if (start > 2) items.push("ellipsis");
  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }
  if (end < totalPages - 1) items.push("ellipsis");
  items.push(totalPages);
  return items;
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
  folder: initialFolder,
  q: initialSearch,
  canUpload,
  canDelete,
  adminImageMaxMb = 5,
}: MediaLibraryClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch);
  const [urlSearch, setUrlSearch] = useState(initialSearch);
  const [folder, setFolder] = useState<MediaFolderFilter>(initialFolder);
  const [urlFolder, setUrlFolder] = useState<MediaFolderFilter>(initialFolder);
  const [deleteTarget, setDeleteTarget] = useState<MediaRow | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);
  const [deleteBlocked, setDeleteBlocked] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionKey, setSelectionKey] = useState(
    `${initialFolder}|${initialSearch}|${page}|${pageSize}`,
  );

  if (urlSearch !== initialSearch) {
    setUrlSearch(initialSearch);
    setSearch(initialSearch);
  }
  if (urlFolder !== initialFolder) {
    setUrlFolder(initialFolder);
    setFolder(initialFolder);
  }

  const nextSelectionKey = `${initialFolder}|${initialSearch}|${page}|${pageSize}`;
  if (selectionKey !== nextSelectionKey) {
    setSelectionKey(nextSelectionKey);
    setSelectedIds([]);
  }

  const uploadFolder = resolveMediaUploadFolder(folder);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageItems = useMemo(
    () => buildPageItems(page, totalPages),
    [page, totalPages],
  );
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);
  const items = useMemo(() => initialItems, [initialItems]);
  const pageIds = useMemo(() => items.map((item) => item.id), [items]);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const selectedCount = selectedIds.length;
  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(initialSearch.trim()) ||
    folder !== "all" ||
    initialFolder !== "all";

  function applyFilters(options?: {
    page?: number;
    folder?: MediaFolderFilter;
    search?: string;
    pageSize?: number;
  }) {
    const nextPage = options?.page ?? 1;
    const nextFolder = options?.folder ?? folder;
    const nextSearch = (options?.search ?? search).trim();
    const nextPageSize = options?.pageSize ?? pageSize;

    const params = new URLSearchParams();
    if (nextSearch) params.set("q", nextSearch);
    if (nextFolder && nextFolder !== "all") params.set("folder", nextFolder);
    if (nextPageSize !== DEFAULT_PAGE_SIZE) {
      params.set("pageSize", String(nextPageSize));
    }
    if (nextPage > 1) params.set("page", String(nextPage));

    startTransition(() => {
      router.push(`${getAdminPath("/media")}?${params.toString()}`);
    });
  }

  function commitSearch() {
    const next = search.trim();
    if (next === initialSearch.trim()) return;
    applyFilters({ search: next });
  }

  function clearFilters() {
    setSearch("");
    setFolder("all");
    applyFilters({ search: "", folder: "all" });
  }

  function selectFolder(next: MediaFolderFilter) {
    setFolder(next);
    applyFilters({ folder: next, page: 1 });
  }

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      }
      return prev.filter((item) => item !== id);
    });
  }

  function toggleSelectAllPage() {
    if (allPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
  }

  function openBulkDelete() {
    if (!selectedCount || !canDelete) return;
    setError(null);
    setDeleteTarget(null);
    setDeleteBlocked(false);
    setBulkDeleteIds(selectedIds);
    setDeleteMessage(
      selectedCount === 1
        ? "Delete the selected image? This cannot be undone."
        : `Delete ${selectedCount} selected images? This cannot be undone. Images still in use will be skipped.`,
    );
  }

  function openDelete(item: MediaRow) {
    setError(null);
    setBulkDeleteIds(null);
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
    <>
      <div
        className={cn(
          adminCard(),
          "grid overflow-hidden lg:grid-cols-[11rem_minmax(0,1fr)]",
        )}
      >
        <aside className="flex flex-col gap-1.5 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-card))] px-1.5 py-2 lg:border-b-0 lg:border-r">
          <p className="px-1.5 pb-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
            Folders by page
          </p>
          <MediaFolderNav
            size="sm"
            showLabels
            active={folder}
            disabled={pending}
            onSelect={selectFolder}
          />
          <p className="mt-auto hidden border-t border-[var(--color-border)] px-1.5 pt-1.5 text-[9px] leading-snug text-[var(--color-muted)] xl:block">
            {folder === "all"
              ? "Upload from All → Homepage & pages. Same folders as the image picker popup."
              : MEDIA_FOLDER_HINTS[folder]}
          </p>
        </aside>

        <div className="flex min-w-0 flex-col">
          <div className="space-y-2.5 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_35%,var(--color-card))] p-2.5 sm:p-3">
            <p className="text-[11px] leading-snug text-[var(--color-muted)]">
              {mediaFolderLibraryDescription(folder)}
            </p>
            {canUpload ? (
              <UploadDropzone
                compact
                disabled={pending}
                label="Drop images here"
                hint={`${mediaFolderLabel(uploadFolder)} — ${mediaFolderHint(uploadFolder)} · JPEG / PNG / WebP · max ${adminImageMaxMb} MB`}
                maxMb={adminImageMaxMb}
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
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <form
                className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(9rem,0.8fr)]"
                onSubmit={(event) => {
                  event.preventDefault();
                  commitSearch();
                }}
              >
                <TextField
                  size="small"
                  fullWidth
                  label="Search"
                  placeholder="File name"
                  value={search}
                  disabled={pending}
                  onChange={(event) => setSearch(event.target.value)}
                  onBlur={commitSearch}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitSearch();
                    }
                  }}
                  slotProps={{
                    input: {
                      endAdornment: hasActiveFilters ? (
                        <InputAdornment position="end">
                          <IconButton
                            type="button"
                            size="small"
                            edge="end"
                            aria-label="Clear filters"
                            disabled={pending}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={clearFilters}
                            sx={{
                              color: "var(--color-muted)",
                              "&:hover": { color: "var(--color-foreground)" },
                            }}
                          >
                            <CloseIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </InputAdornment>
                      ) : undefined,
                    },
                  }}
                />
                <AdminSelect
                  label="Folder"
                  value={folder}
                  disabled={pending}
                  options={FOLDER_SELECT_OPTIONS}
                  onChange={(next) => {
                    selectFolder(next as MediaFolderFilter);
                  }}
                />
              </form>

              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 sm:justify-end">
                <p className="text-[11px] tabular-nums text-[var(--color-muted)]">
                  {total === 0 ? (
                    "0 images"
                  ) : (
                    <>
                      <span className="font-semibold text-[var(--color-foreground)]">
                        {rangeStart}–{rangeEnd}
                      </span>
                      <span className="mx-1 opacity-50">/</span>
                      <span className="font-semibold text-[var(--color-foreground)]">
                        {total}
                      </span>
                    </>
                  )}
                </p>

                {total > 0 ? (
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      disabled={page <= 1 || pending}
                      onClick={() => applyFilters({ page: page - 1 })}
                      className={cn(
                        pagerBtn,
                        "border-[var(--color-border)] bg-[var(--color-card)]",
                      )}
                    >
                      Prev
                    </button>
                    {pageItems.map((item, index) =>
                      item === "ellipsis" ? (
                        <span
                          key={`ellipsis-${index}`}
                          className="px-0.5 text-[11px] text-[var(--color-muted)]"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          disabled={pending || item === page}
                          onClick={() => applyFilters({ page: item })}
                          className={cn(
                            pagerBtn,
                            item === page
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-button-foreground)]"
                              : "border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-surface)]",
                          )}
                        >
                          {item}
                        </button>
                      ),
                    )}
                    <button
                      type="button"
                      disabled={page >= totalPages || pending}
                      onClick={() => applyFilters({ page: page + 1 })}
                      className={cn(
                        pagerBtn,
                        "border-[var(--color-border)] bg-[var(--color-card)]",
                      )}
                    >
                      Next
                    </button>
                    <div className="w-[5.5rem]">
                      <AdminSelect
                        label="Rows"
                        value={String(pageSize)}
                        disabled={pending}
                        fullWidth
                        options={PAGE_SIZE_OPTIONS}
                        onChange={(value) => {
                          const next = value === "48" ? 48 : 24;
                          applyFilters({ pageSize: next, page: 1 });
                        }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {error ? (
              <Alert severity="error" sx={{ py: 0, fontSize: 12 }}>
                {error}
              </Alert>
            ) : null}
            {success ? (
              <Alert severity="success" sx={{ py: 0, fontSize: 12 }}>
                {success}
              </Alert>
            ) : null}
          </div>

          <div className="min-w-0 space-y-2 p-2.5 sm:p-3">
            {canDelete && items.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_40%,var(--color-card))] px-2.5 py-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={toggleSelectAllPage}
                    className={cn(
                      adminBtn("outline"),
                      "!min-h-7 !px-2 !text-[11px]",
                    )}
                  >
                    {allPageSelected ? "Clear selection" : "Select images"}
                  </button>
                  {selectedCount > 0 ? (
                    <>
                      <span className="text-[11px] font-semibold tabular-nums text-[var(--color-foreground)]">
                        {selectedCount} selected
                      </span>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setSelectedIds([])}
                        className={cn(
                          adminBtn("ghost"),
                          "!min-h-7 !px-2 !text-[11px]",
                        )}
                      >
                        Clear
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] text-[var(--color-muted)]">
                      Select images to delete
                    </span>
                  )}
                </div>
                {selectedCount > 0 ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={openBulkDelete}
                    className={cn(
                      adminBtn("danger"),
                      "!min-h-7 !px-2.5 !text-[11px]",
                    )}
                  >
                    Delete selected
                  </button>
                ) : null}
              </div>
            ) : null}

            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_50%,var(--color-card))] px-3 py-10 text-center">
                <p className="text-[13px] font-semibold text-[var(--color-foreground)]">
                  No images yet
                </p>
                <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                  Upload here, or switch folders on the left.
                </p>
              </div>
            ) : (
              <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                {items.map((item) => {
                  const url = item.preview_url || null;
                  return (
                    <li key={item.id}>
                      <MediaAssetTile
                        fileName={item.file_name}
                        altText={item.alt_text}
                        previewUrl={url}
                        meta={`${mediaFolderLabel(item.folder)}${
                          item.file_size
                            ? ` · ${formatBytes(item.file_size)}`
                            : ""
                        }`}
                        disabled={pending}
                        canDelete={canDelete}
                        checked={selectedIds.includes(item.id)}
                        onCheckedChange={
                          canDelete
                            ? (checked) => toggleSelected(item.id, checked)
                            : undefined
                        }
                        onCopyPath={async () => {
                          await navigator.clipboard.writeText(item.storage_path);
                          setSuccess("Path copied.");
                        }}
                        onCopyLink={
                          url
                            ? async () => {
                                await navigator.clipboard.writeText(url);
                                setSuccess("Link copied.");
                              }
                            : undefined
                        }
                        onDelete={() => openDelete(item)}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget) || Boolean(bulkDeleteIds?.length)}
        title={
          deleteBlocked
            ? "Can't delete this image"
            : bulkDeleteIds?.length
              ? "Delete selected images?"
              : "Delete image?"
        }
        message={deleteMessage}
        blocked={deleteBlocked}
        warningTone={deleteBlocked}
        pending={pending}
        confirmLabel={
          bulkDeleteIds?.length && bulkDeleteIds.length > 1
            ? `Delete ${bulkDeleteIds.length}`
            : "Delete"
        }
        onClose={() => {
          if (pending) return;
          setDeleteTarget(null);
          setBulkDeleteIds(null);
        }}
        onConfirm={() => {
          if (bulkDeleteIds?.length) {
            const ids = bulkDeleteIds;
            startTransition(async () => {
              const result = await deleteMediaBulkAction(ids);
              if (!result.ok) {
                setError(result.error);
                setBulkDeleteIds(null);
                return;
              }
              setSuccess(result.message ?? "Images deleted.");
              setBulkDeleteIds(null);
              setSelectedIds([]);
              if (result.failed?.length) {
                setError(
                  `Skipped ${result.failed.length}: ${result.failed[0]?.error ?? "in use"}`,
                );
              }
              router.refresh();
            });
            return;
          }
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
            setSelectedIds((prev) =>
              prev.filter((id) => id !== deleteTarget.id),
            );
            router.refresh();
          });
        }}
      />
    </>
  );
}
