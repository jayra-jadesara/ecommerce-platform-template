"use client";

import CloseIcon from "@mui/icons-material/Close";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  getAdminImageMaxMbAction,
  listMediaAction,
  uploadMediaAction,
} from "@/features/media/actions";
import { MediaAssetTile } from "@/features/media/components/MediaAssetTile";
import { MediaFolderNav } from "@/features/media/components/MediaFolderNav";
import { UploadDropzone } from "@/features/media/components/UploadDropzone";
import type { MediaRow } from "@/features/media/media-service";
import {
  mediaFolderHint,
  mediaFolderLabel,
  resolveMediaUploadFolder,
  type MediaFolderFilter,
} from "@/features/media/media-folder-labels";
import { ADMIN_IMAGE_MAX_MB_DEFAULT } from "@/features/media/upload-limits";
import type { MediaFolder } from "@/features/media/validation";
import { adminBtn } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";

export type MediaPickerSelection = {
  id: string;
  storagePath: string;
  publicUrl?: string;
  altText?: string | null;
  folder?: string | null;
};

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (selection: MediaPickerSelection) => void;
  folder?: MediaFolder | "all";
  /** Allow uploading from this dialog. Default true. */
  allowUpload?: boolean;
  /** Optional override; otherwise loaded from store settings when opened. */
  adminImageMaxMb?: number;
}

export function MediaPicker({
  open,
  onClose,
  onSelect,
  folder = "all",
  allowUpload = true,
  adminImageMaxMb,
}: MediaPickerProps) {
  const [browseFolder, setBrowseFolder] = useState<MediaFolderFilter>(folder);
  const [items, setItems] = useState<MediaRow[]>([]);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedMaxMb, setResolvedMaxMb] = useState(
    adminImageMaxMb ?? ADMIN_IMAGE_MAX_MB_DEFAULT,
  );

  const uploadFolder = resolveMediaUploadFolder(
    folder !== "all" ? folder : browseFolder,
  );

  const refreshList = useCallback(
    async (target: MediaFolderFilter, q = "") => {
      const result = await listMediaAction({
        page: 1,
        pageSize: 48,
        folder: target,
        q: q.trim() || undefined,
      });
      setItems(result.items);
      return result.items;
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- reset list when dialog opens */
    setBrowseFolder(folder);
    setSearch("");
    startTransition(async () => {
      setError(null);
      if (adminImageMaxMb != null) {
        setResolvedMaxMb(adminImageMaxMb);
      } else {
        try {
          setResolvedMaxMb(await getAdminImageMaxMbAction());
        } catch {
          setResolvedMaxMb(ADMIN_IMAGE_MAX_MB_DEFAULT);
        }
      }
      await refreshList(folder);
    });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, folder, refreshList, adminImageMaxMb]);

  const filteredHint = useMemo(() => {
    if (!search.trim()) return null;
    return `${items.length} match${items.length === 1 ? "" : "es"}`;
  }, [items.length, search]);

  function selectBrowseFolder(next: MediaFolderFilter) {
    setBrowseFolder(next);
    startTransition(async () => {
      setError(null);
      await refreshList(next, search);
    });
  }

  function commitSearch() {
    startTransition(async () => {
      setError(null);
      await refreshList(browseFolder, search);
    });
  }

  function selectItem(item: {
    id: string;
    storage_path: string;
    preview_url?: string | null;
    public_url?: string | null;
    alt_text?: string | null;
    folder?: string | null;
  }) {
    onSelect({
      id: item.id,
      storagePath: item.storage_path,
      publicUrl: item.preview_url || item.public_url || undefined,
      altText: item.alt_text,
      folder: item.folder,
    });
    onClose();
  }

  async function handleUpload(files: File[]) {
    setError(null);
    setUploading(true);
    try {
      let lastOk: {
        id: string;
        path: string;
        url?: string | null;
      } | null = null;

      for (const file of files) {
        const formData = new FormData();
        formData.set("file", file);
        formData.set("folder", uploadFolder);
        const result = await uploadMediaAction(formData);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        if (result.id && result.path) {
          lastOk = {
            id: result.id,
            path: result.path,
            url: result.url,
          };
        }
      }

      const listFolder: MediaFolderFilter =
        folder !== "all" ? folder : uploadFolder;
      setBrowseFolder(listFolder);
      const nextItems = await refreshList(listFolder, "");

      if (lastOk) {
        const matched = nextItems.find((row) => row.id === lastOk!.id);
        selectItem(
          matched ?? {
            id: lastOk.id,
            storage_path: lastOk.path,
            public_url: lastOk.url,
            preview_url: lastOk.url,
            folder: uploadFolder,
            alt_text: null,
          },
        );
      }
    } finally {
      setUploading(false);
    }
  }

  const busy = uploading || pending;

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="md"
      slotProps={{
        paper: {
          elevation: 0,
          className: "admin-form-dialog-paper",
          sx: {
            margin: 1.5,
            maxHeight: "calc(100vh - 1.5rem)",
            border: "1px solid var(--color-border)",
            outline: "none",
            backgroundImage: "none",
            backgroundColor: "var(--color-card)",
            color: "var(--color-foreground)",
            boxShadow:
              "0 20px 48px color-mix(in srgb, var(--color-foreground) 18%, transparent)",
            overflow: "hidden",
            borderRadius: "16px",
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 1,
          borderBottom: "1px solid var(--color-border)",
          py: 1.25,
          px: 1.75,
        }}
      >
        <div className="min-w-0 pr-2">
          <p className="text-[0.9375rem] font-semibold tracking-[-0.01em] text-[var(--color-foreground)]">
            Choose an image
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-[var(--color-muted)]">
            Same library as{" "}
            <span className="font-medium text-[var(--color-foreground)]">
              Images &amp; Files
            </span>
            . Folders match Content pages — pick Contact, About, Career, and more
            on the left.
          </p>
        </div>
        <IconButton
          type="button"
          size="small"
          aria-label="Close"
          disabled={busy}
          onClick={onClose}
          sx={{ color: "var(--color-muted)", mt: -0.25 }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers={false}
        sx={{
          p: 0,
          display: "flex",
          flexDirection: "column",
          maxHeight: "min(72vh, 620px)",
          overflow: "hidden",
        }}
      >
        <div className="grid min-h-0 flex-1 grid-cols-[10.5rem_minmax(0,1fr)] overflow-hidden">
          <aside className="flex flex-col gap-1 overflow-y-auto border-r border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-card))] px-1.5 py-2">
            <p className="px-1.5 pb-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
              Folders by page
            </p>
            <MediaFolderNav
              size="sm"
              showLabels
              active={browseFolder}
              onSelect={selectBrowseFolder}
              disabled={busy}
            />
          </aside>

          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
            <div className="shrink-0 space-y-2 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_35%,var(--color-card))] p-2.5 sm:p-3">
              {allowUpload ? (
                <UploadDropzone
                  compact
                  multiple={false}
                  disabled={busy}
                  label="Upload new"
                  hint={`${mediaFolderLabel(uploadFolder)} — ${mediaFolderHint(uploadFolder)} · max ${resolvedMaxMb} MB`}
                  maxMb={resolvedMaxMb}
                  onFiles={handleUpload}
                />
              ) : null}

              <TextField
                size="small"
                fullWidth
                label="Search"
                placeholder="File name"
                value={search}
                disabled={busy}
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
                    endAdornment: search ? (
                      <InputAdornment position="end">
                        <IconButton
                          type="button"
                          size="small"
                          edge="end"
                          aria-label="Clear search"
                          disabled={busy}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setSearch("");
                            startTransition(async () => {
                              await refreshList(browseFolder, "");
                            });
                          }}
                          sx={{ color: "var(--color-muted)" }}
                        >
                          <CloseIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </InputAdornment>
                    ) : undefined,
                  },
                }}
              />

              {filteredHint ? (
                <p className="text-[10px] font-medium text-[var(--color-muted)]">
                  {filteredHint}
                </p>
              ) : null}
              {error ? (
                <p className="text-[12px] text-[var(--color-error)]" role="alert">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2.5 sm:p-3">
              {pending && items.length === 0 ? (
                <p className="py-6 text-center text-[12px] text-[var(--color-muted)]">
                  Loading…
                </p>
              ) : null}

              {!pending && items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--color-border)] px-3 py-8 text-center">
                  <p className="text-[12px] font-medium text-[var(--color-foreground)]">
                    No images in this folder
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
                    {allowUpload
                      ? "Upload above, or try another folder."
                      : "Try another folder."}
                  </p>
                </div>
              ) : items.length > 0 ? (
                <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5">
                  {items.map((item) => (
                    <li key={item.id}>
                      <MediaAssetTile
                        fileName={item.file_name}
                        altText={item.alt_text}
                        previewUrl={item.preview_url}
                        meta={mediaFolderLabel(item.folder)}
                        disabled={busy}
                        onSelect={() => selectItem(item)}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>

      <DialogActions
        sx={{
          borderTop: "1px solid var(--color-border)",
          px: 1.75,
          py: 1.25,
          gap: 1,
        }}
      >
        <button
          type="button"
          className={cn(adminBtn("secondary"), "!min-h-8 !px-2.5 !text-xs")}
          disabled={busy}
          onClick={onClose}
        >
          Cancel
        </button>
      </DialogActions>
    </Dialog>
  );
}
