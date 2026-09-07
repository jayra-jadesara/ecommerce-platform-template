"use client";

import Image from "next/image";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
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
import { resolvePublicStorageUrl } from "@/lib/supabase/storage-url";
import { bucketForFolder } from "@/features/media/validation";
import { getAdminPath } from "@/config/admin-route";

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

function mediaPreviewUrl(row: MediaRow): string | undefined {
  if (row.public_url) return row.public_url;
  const folder = (row.folder || "general") as MediaFolder;
  const bucket = bucketForFolder(
    MEDIA_FOLDERS.includes(folder as MediaFolder) ? folder : "general",
  );
  return resolvePublicStorageUrl(bucket, row.storage_path);
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
    folder === "all" ? "general" : folder,
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const items = useMemo(() => initialItems, [initialItems]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 lg:grid-cols-[1fr_220px]">
        <UploadDropzone
          disabled={!canUpload || pending}
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
            setSuccess("Upload complete.");
            router.refresh();
          }}
        />
        <TextField
          select
          label="Upload folder"
          value={uploadFolder}
          disabled={!canUpload}
          onChange={(event) =>
            setUploadFolder(event.target.value as MediaFolder)
          }
        >
          {MEDIA_FOLDERS.map((value) => (
            <MenuItem key={value} value={value}>
              {value}
            </MenuItem>
          ))}
        </TextField>
      </div>

      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          router.push(
            buildHref({
              q: String(form.get("q") ?? ""),
              folder: String(form.get("folder") ?? "all"),
              page: 1,
            }),
          );
        }}
      >
        <TextField
          name="q"
          label="Search"
          size="small"
          defaultValue={q}
          fullWidth
        />
        <TextField
          select
          name="folder"
          label="Filter"
          size="small"
          defaultValue={folder}
          className="min-w-40"
        >
          <MenuItem value="all">All</MenuItem>
          {MEDIA_FOLDERS.map((value) => (
            <MenuItem key={value} value={value}>
              {value}
            </MenuItem>
          ))}
        </TextField>
        <Button type="submit" variant="outlined">
          Apply
        </Button>
      </form>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-10 text-center text-sm text-[var(--color-muted)]">
          No media found for this store yet.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => {
            const url = mediaPreviewUrl(item);
            return (
              <li
                key={item.id}
                className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]"
              >
                <div className="relative aspect-square bg-[var(--color-surface)]">
                  {url ? (
                    <Image
                      src={url}
                      alt={item.alt_text || item.file_name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 240px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-[var(--color-muted)]">
                      Private media
                    </div>
                  )}
                </div>
                <div className="space-y-2 p-3">
                  <p className="truncate text-sm font-medium">{item.file_name}</p>
                  <div className="flex flex-wrap gap-1">
                    <Chip size="small" label={item.folder || "general"} />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={item.mime_type}
                    />
                  </div>
                  <p className="truncate text-xs text-[var(--color-muted)]">
                    {item.storage_path}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="small"
                      onClick={async () => {
                        await navigator.clipboard.writeText(item.storage_path);
                        setSuccess("Storage path copied.");
                      }}
                    >
                      Copy path
                    </Button>
                    {url ? (
                      <Button
                        size="small"
                        onClick={async () => {
                          await navigator.clipboard.writeText(url);
                          setSuccess("URL copied.");
                        }}
                      >
                        Copy URL
                      </Button>
                    ) : null}
                    <Button
                      size="small"
                      color="error"
                      disabled={!canDelete || pending}
                      onClick={() => {
                        if (!window.confirm("Delete this media item?")) return;
                        startTransition(async () => {
                          const result = await deleteMediaAction(item.id);
                          if (!result.ok) {
                            setError(result.error);
                            return;
                          }
                          setSuccess(result.message);
                          router.refresh();
                        });
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-between text-sm">
        <p className="text-[var(--color-muted)]">
          {total} item{total === 1 ? "" : "s"} · page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            size="small"
            disabled={page <= 1}
            href={buildHref({ q, folder, page: page - 1 })}
          >
            Previous
          </Button>
          <Button
            size="small"
            disabled={page >= totalPages}
            href={buildHref({ q, folder, page: page + 1 })}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
