"use client";

import { useCallback, useRef, useState } from "react";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import LinearProgress from "@mui/material/LinearProgress";
import {
  ALLOWED_IMAGE_MIME,
  validateImageUpload,
} from "@/features/media/validation";
import {
  ADMIN_IMAGE_MAX_MB_DEFAULT,
  formatMaxMbHint,
  mbToBytes,
} from "@/features/media/upload-limits";
import { adminBtn } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";

interface UploadDropzoneProps {
  disabled?: boolean;
  multiple?: boolean;
  onFiles: (files: File[]) => void | Promise<void>;
  label?: string;
  hint?: string;
  /** Admin-configured max size in MB (1–10). Default 5. */
  maxMb?: number;
  /** Tighter padding and single-row layout for forms / picker. */
  compact?: boolean;
}

export function UploadDropzone({
  disabled,
  multiple = true,
  onFiles,
  label = "Upload images",
  hint,
  maxMb = ADMIN_IMAGE_MAX_MB_DEFAULT,
  compact = false,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const effectiveMb = maxMb ?? ADMIN_IMAGE_MAX_MB_DEFAULT;
  const maxBytes = mbToBytes(effectiveMb);
  const resolvedHint = hint ?? `${formatMaxMbHint(effectiveMb)} each`;

  const handleFiles = useCallback(
    async (list: FileList | File[]) => {
      const files = Array.from(list);
      setError(null);
      const accepted: File[] = [];
      for (const file of files) {
        const result = validateImageUpload({
          declaredMime: file.type,
          size: file.size,
          fileName: file.name,
          maxBytes,
        });
        if (!result.ok) {
          setError(result.error);
          continue;
        }
        accepted.push(file);
      }
      if (!accepted.length) return;
      setBusy(true);
      try {
        await onFiles(accepted);
      } finally {
        setBusy(false);
      }
    },
    [maxBytes, onFiles],
  );

  return (
    <div
      className={cn(
        "rounded-xl border border-dashed text-center transition-colors",
        compact ? "px-2.5 py-2" : "p-5",
        dragging
          ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-surface))]"
          : "border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_55%,var(--color-card))]",
      )}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (disabled) return;
        void handleFiles(event.dataTransfer.files);
      }}
    >
      {compact ? (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <div className="flex min-w-0 items-center gap-2 text-left">
            <span
              className={cn(
                "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                "bg-[var(--color-card)] text-[var(--color-muted)]",
                "ring-1 ring-[var(--color-border)]",
              )}
            >
              <CloudUploadOutlinedIcon sx={{ fontSize: 16 }} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold leading-tight">
                {label}
              </p>
              <p className="truncate text-[10px] leading-snug text-[var(--color-muted)]">
                {resolvedHint}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
            className={cn(adminBtn("outline"), "!min-h-8 !px-2.5 !text-xs")}
          >
            {busy ? "Uploading…" : "Choose"}
          </button>
        </div>
      ) : (
        <>
          <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-card)] text-[var(--color-muted)] ring-1 ring-[var(--color-border)]">
            <CloudUploadOutlinedIcon sx={{ fontSize: 20 }} />
          </div>
          <p className="text-sm font-semibold tracking-tight">{label}</p>
          <p className="mt-1 text-[12px] leading-snug text-[var(--color-muted)]">
            {resolvedHint}
          </p>
          <div className="mt-3">
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => inputRef.current?.click()}
              className={cn(adminBtn("outline"), "!min-h-9 !px-3 !text-xs")}
            >
              {busy ? "Uploading…" : "Choose files"}
            </button>
          </div>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        hidden
        multiple={multiple}
        accept={ALLOWED_IMAGE_MIME.join(",")}
        onChange={(event) => {
          if (event.target.files) void handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
      {busy ? (
        <LinearProgress
          className={compact ? "mt-2 !h-0.5 rounded-full" : "mt-3 !h-1 rounded-full"}
        />
      ) : null}
      {error ? (
        <p
          className={cn(
            "text-[11px] text-[var(--color-error)]",
            compact ? "mt-1.5" : "mt-2.5",
          )}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
