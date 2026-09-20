"use client";

import { useCallback, useRef, useState } from "react";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import {
  ALLOWED_IMAGE_MIME,
  MAX_MEDIA_IMAGE_BYTES,
  validateImageUpload,
} from "@/features/media/validation";

interface UploadDropzoneProps {
  disabled?: boolean;
  multiple?: boolean;
  onFiles: (files: File[]) => void | Promise<void>;
  label?: string;
  hint?: string;
  /** Tighter padding and single-row layout for forms. */
  compact?: boolean;
}

export function UploadDropzone({
  disabled,
  multiple = true,
  onFiles,
  label = "Upload images",
  hint = "JPEG, PNG, or WebP · max 5 MB each",
  compact = false,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
          maxBytes: MAX_MEDIA_IMAGE_BYTES,
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
    [onFiles],
  );

  return (
    <div
      className={`rounded-xl border border-dashed text-center transition-colors ${
        compact ? "px-3 py-2.5" : "p-6"
      } ${
        dragging
          ? "border-[var(--color-primary)] bg-[var(--color-surface)]"
          : "border-[var(--color-border)] bg-[var(--color-card)]"
      }`}
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
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
          <div className="min-w-0 text-left sm:text-center">
            <p className="text-sm font-medium leading-snug">{label}</p>
            <p className="text-[11px] leading-snug text-[var(--color-muted)]">
              {hint}
            </p>
          </div>
          <Button
            type="button"
            size="small"
            variant="outlined"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Uploading…" : "Choose files"}
          </Button>
        </div>
      ) : (
        <>
          <p className="font-medium">{label}</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{hint}</p>
          <div className="mt-4">
            <Button
              type="button"
              variant="outlined"
              disabled={disabled || busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? "Uploading…" : "Choose files"}
            </Button>
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
        <LinearProgress className={compact ? "mt-2" : "mt-4"} />
      ) : null}
      {error ? (
        <p
          className={`text-sm text-[var(--color-error)] ${compact ? "mt-1.5" : "mt-3"}`}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
