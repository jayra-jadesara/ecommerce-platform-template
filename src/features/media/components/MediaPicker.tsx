"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useEffect, useState, useTransition } from "react";
import { listMediaAction } from "@/features/media/actions";
import type { MediaRow } from "@/features/media/media-service";
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
      <DialogTitle>Choose an image</DialogTitle>
      <DialogContent>
        {pending ? (
          <p className="text-sm text-[var(--color-muted)]">Loading images…</p>
        ) : null}
        {error ? (
          <p className="text-sm text-[var(--color-error)]">{error}</p>
        ) : null}
        {!pending && items.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-muted)]">
            No images in this folder yet. Upload some under Content → Images
            &amp; Files.
          </p>
        ) : (
          <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {items.map((item) => {
              const url = item.preview_url || undefined;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className="w-full overflow-hidden rounded-xl border border-[var(--color-border)] text-left transition hover:border-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
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
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt={item.alt_text || item.file_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center p-2 text-center text-xs text-[var(--color-muted)]">
                          {item.file_name}
                        </div>
                      )}
                    </div>
                    <p className="truncate px-2 py-1.5 text-xs font-medium">
                      {item.file_name}
                    </p>
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
