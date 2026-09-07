"use client";

import { useEffect } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";

interface SettingsFormToolbarProps {
  isDirty: boolean;
  canUpdate: boolean;
  pending: boolean;
  error: string | null;
  success: string | null;
  onSave: () => void;
  onCancel: () => void;
  onResetDefaults?: () => void;
}

export function SettingsFormToolbar({
  isDirty,
  canUpdate,
  pending,
  error,
  success,
  onSave,
  onCancel,
  onResetDefaults,
}: SettingsFormToolbarProps) {
  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  return (
    <div className="sticky top-0 z-20 -mx-1 mb-4 space-y-3 border-b border-[var(--color-border)] bg-[var(--color-background)]/95 px-1 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        {isDirty ? (
          <Chip label="Unsaved changes" color="warning" size="small" />
        ) : null}
        {!canUpdate ? (
          <Chip label="View only" size="small" variant="outlined" />
        ) : null}
        <div className="ml-auto flex flex-wrap gap-2">
          {onResetDefaults ? (
            <Button
              type="button"
              variant="outlined"
              disabled={!canUpdate || pending}
              onClick={onResetDefaults}
            >
              Reset to default
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outlined"
            disabled={!isDirty || pending}
            onClick={() => {
              if (isDirty && !window.confirm("Discard unsaved changes?")) return;
              onCancel();
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="contained"
            disabled={!canUpdate || !isDirty || pending}
            onClick={onSave}
          >
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}
    </div>
  );
}
