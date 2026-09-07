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
}

export function UploadDropzone({
  disabled,
  multiple = true,
  onFiles,
  label = "Upload images",
  hint = "JPEG, PNG, or WEBP up to 10 MB",
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
      className={`rounded-xl border border-dashed p-6 text-center transition-colors ${
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
      </div>
      {busy ? <LinearProgress className="mt-4" /> : null}
      {error ? (
        <p className="mt-3 text-sm text-[var(--color-error)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
