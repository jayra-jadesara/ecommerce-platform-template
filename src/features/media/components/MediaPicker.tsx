"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  listMediaAction,
  uploadMediaAction,
} from "@/features/media/actions";
import { MediaFolderNav } from "@/features/media/components/MediaFolderNav";
import { UploadDropzone } from "@/features/media/components/UploadDropzone";
import type { MediaRow } from "@/features/media/media-service";
import {
  mediaFolderLabel,
  resolveMediaUploadFolder,
  type MediaFolderFilter,
} from "@/features/media/media-folder-labels";
import type { MediaFolder } from "@/features/media/validation";

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
}

export function MediaPicker({
  open,
  onClose,
  onSelect,
  folder = "all",
  allowUpload = true,
}: MediaPickerProps) {
  const [browseFolder, setBrowseFolder] = useState<MediaFolderFilter>(folder);
  const [items, setItems] = useState<MediaRow[]>([]);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFolder = resolveMediaUploadFolder(
    folder !== "all" ? folder : browseFolder,
  );

  const refreshList = useCallback(async (target: MediaFolderFilter) => {
    const result = await listMediaAction({
      page: 1,
      pageSize: 48,
      folder: target,
    });
    setItems(result.items);
    return result.items;
  }, []);

  useEffect(() => {
    if (!open) return;
    setBrowseFolder(folder);
    startTransition(async () => {
      setError(null);
      await refreshList(folder);
    });
  }, [open, folder, refreshList]);

  function selectBrowseFolder(next: MediaFolderFilter) {
    setBrowseFolder(next);
    startTransition(async () => {
      setError(null);
      await refreshList(next);
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
      const nextItems = await refreshList(listFolder);

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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      slotProps={{
        paper: {
          elevation: 8,
          sx: {
            border: "none",
            outline: "none",
            backgroundImage: "none",
            backgroundColor: "var(--color-card)",
            color: "var(--color-foreground)",
            boxShadow:
              "0 24px 64px color-mix(in srgb, var(--color-foreground) 28%, transparent)",
            overflow: "hidden",
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          borderBottom: "1px solid var(--color-border)",
          py: 1.75,
        }}
      >
        Choose an image
      </DialogTitle>
      <DialogContent
        dividers={false}
        sx={{
          p: 0,
          display: "flex",
          flexDirection: "column",
          maxHeight: "min(70vh, 640px)",
          overflow: "hidden",
        }}
      >
        <div className="grid min-h-0 flex-1 grid-cols-[4.5rem_minmax(0,1fr)] overflow-hidden">
          <aside className="sticky top-0 flex h-full max-h-[min(70vh,640px)] flex-col items-center gap-2 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface)] py-3">
            <MediaFolderNav
              active={browseFolder}
              onSelect={selectBrowseFolder}
              disabled={uploading || pending}
            />
          </aside>

          <div className="min-h-0 min-w-0 space-y-3 overflow-y-auto p-4">
            {allowUpload ? (
              <UploadDropzone
                multiple={false}
                disabled={uploading || pending}
                label="Upload a new image"
                hint={`Saved to ${mediaFolderLabel(uploadFolder)} · JPEG, PNG, or WebP · max 5 MB`}
                onFiles={handleUpload}
              />
            ) : null}

            {pending && items.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">Loading images…</p>
            ) : null}
            {error ? (
              <p className="text-sm text-[var(--color-error)]" role="alert">
                {error}
              </p>
            ) : null}

            {!pending && items.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--color-muted)]">
                {allowUpload
                  ? "No images in this folder yet. Upload one above."
                  : "No images in this folder yet."}
              </p>
            ) : items.length > 0 ? (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {items.map((item) => {
                  const url = item.preview_url || undefined;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        disabled={uploading}
                        className="w-full overflow-hidden rounded-lg border border-[var(--color-border)] text-left transition hover:border-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:opacity-50"
                        onClick={() => selectItem(item)}
                      >
                        <div className="relative aspect-square bg-[var(--color-surface)] p-1">
                          {url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={url}
                              alt={item.alt_text || item.file_name}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center p-1 text-center text-[10px] text-[var(--color-muted)]">
                              {item.file_name}
                            </div>
                          )}
                        </div>
                        <p
                          className="truncate px-1.5 py-1 text-[10px] font-medium"
                          title={item.file_name}
                        >
                          {item.file_name}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </div>
      </DialogContent>
      <DialogActions
        sx={{
          borderTop: "1px solid var(--color-border)",
          px: 2,
          py: 1.5,
        }}
      >
        <Button onClick={onClose} disabled={uploading}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
