"use client";

import { useEffect } from "react";
import { AdminStatusBadge } from "@/features/admin/ui/AdminStatusBadge";
import { adminBtn } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";

export interface AdminSaveBarProps {
  isDirty: boolean;
  canUpdate: boolean;
  pending: boolean;
  error: string | null;
  success: string | null;
  onSave: () => void;
  onCancel: () => void;
  onResetDefaults?: () => void;
  /** Sticky top (settings) or bottom (long editors). */
  position?: "top" | "bottom";
}

/**
 * Shared save experience for Admin settings & long forms.
 * Native buttons avoid MUI Emotion class hydration mismatches.
 * Reset never auto-saves.
 */
export function AdminSaveBar({
  isDirty,
  canUpdate,
  pending,
  error,
  success,
  onSave,
  onCancel,
  onResetDefaults,
  position = "top",
}: AdminSaveBarProps) {
  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const sticky =
    position === "top"
      ? "sticky top-0 z-20 -mx-1 mb-6 border-b"
      : "sticky bottom-0 z-20 -mx-1 mt-6 border-t";

  return (
    <div
      className={`${sticky} space-y-3 border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-background)_88%,var(--color-surface)_12%)] px-1 py-3 backdrop-blur-md`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {isDirty ? (
          <AdminStatusBadge tone="warning">Unsaved changes</AdminStatusBadge>
        ) : (
          <AdminStatusBadge tone="neutral">All changes saved</AdminStatusBadge>
        )}
        {!canUpdate ? (
          <AdminStatusBadge tone="neutral">View only</AdminStatusBadge>
        ) : null}
        <div className="ml-auto flex flex-wrap gap-2">
          {onResetDefaults ? (
            <button
              type="button"
              className={cn(adminBtn("ghost"), "!min-h-9")}
              disabled={!canUpdate || pending}
              onClick={() => {
                if (
                  !window.confirm(
                    "Reset this form to defaults? Unsaved changes will be discarded. Nothing is saved until you click Save.",
                  )
                ) {
                  return;
                }
                onResetDefaults();
              }}
            >
              Reset to default
            </button>
          ) : null}
          <button
            type="button"
            className={cn(adminBtn("outline"), "!min-h-9")}
            disabled={!isDirty || pending}
            onClick={() => {
              if (isDirty && !window.confirm("Discard unsaved changes?")) return;
              onCancel();
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className={cn(adminBtn("primary"), "!min-h-9")}
            disabled={!canUpdate || !isDirty || pending}
            onClick={onSave}
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
      {error ? (
        <p
          className="rounded-xl border border-[color-mix(in_srgb,var(--color-error)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)] px-3 py-2 text-sm text-[var(--color-error)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {success ? (
        <p
          className="rounded-xl border border-[color-mix(in_srgb,var(--color-success)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_10%,transparent)] px-3 py-2 text-sm text-[var(--color-success)]"
          role="status"
        >
          {success}
        </p>
      ) : null}
    </div>
  );
}

/** @deprecated Use AdminSaveBar — kept as alias for existing settings forms. */
export function SettingsFormToolbar(props: AdminSaveBarProps) {
  return <AdminSaveBar {...props} position="top" />;
}
