"use client";

import Image from "next/image";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useEffect, useState, useTransition } from "react";
import { listMediaAction } from "@/features/media/actions";
import type { MediaRow } from "@/features/media/media-service";
import { MEDIA_FOLDERS, type MediaFolder } from "@/features/media/validation";
import { bucketForFolder } from "@/features/media/validation";
import { resolvePublicStorageUrl } from "@/lib/supabase/storage-url";

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
}

function previewUrl(row: MediaRow): string | undefined {
  if (row.public_url) return row.public_url;
  const folder = (row.folder || "general") as MediaFolder;
  const safeFolder = MEDIA_FOLDERS.includes(folder) ? folder : "general";
  return resolvePublicStorageUrl(bucketForFolder(safeFolder), row.storage_path);
}

export function MediaPicker({
  open,
  onClose,
  onSelect,
  folder = "all",
}: MediaPickerProps) {
  const [items, setItems] = useState<MediaRow[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    startTransition(async () => {
      const result = await listMediaAction({
        page: 1,
        pageSize: 48,
        folder,
      });
      setItems(result.items);
      setError(null);
    });
  }, [open, folder]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Select from Media Library</DialogTitle>
      <DialogContent>
        {pending ? (
          <p className="text-sm text-[var(--color-muted)]">Loading media…</p>
        ) : null}
        {error ? (
          <p className="text-sm text-[var(--color-error)]">{error}</p>
        ) : null}
        {!pending && items.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            No media available yet.
          </p>
        ) : (
          <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {items.map((item) => {
              const url = previewUrl(item);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className="w-full overflow-hidden rounded-lg border border-[var(--color-border)] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                    onClick={() => {
                      onSelect({
                        id: item.id,
                        storagePath: item.storage_path,
                        publicUrl: url,
                        altText: item.alt_text,
                        folder: item.folder,
                      });
                      onClose();
                    }}
                  >
                    <div className="relative aspect-square bg-[var(--color-surface)]">
                      {url ? (
                        <Image
                          src={url}
                          alt={item.alt_text || item.file_name}
                          fill
                          className="object-cover"
                          sizes="160px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center p-2 text-center text-xs text-[var(--color-muted)]">
                          {item.file_name}
                        </div>
                      )}
                    </div>
                    <p className="truncate px-2 py-1 text-xs">{item.file_name}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
