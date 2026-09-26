"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import TextField from "@mui/material/TextField";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import {
  executeCleanupAction,
  previewCleanupAction,
} from "@/features/platform-usage/cleanup/actions";
import {
  ACTION_META,
  CONFIRM_PHRASES,
} from "@/features/platform-usage/cleanup/keep-wipe";
import type {
  CleanupActionId,
  CleanupPreview,
  CleanupResult,
} from "@/features/platform-usage/cleanup/types";
import { AdminDialog } from "@/features/admin/ui/AdminDialog";
import { adminBtn, adminCard } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";

const ACTIONS: CleanupActionId[] = [
  "clear_replace_photos",
  "clear_activity_logs",
  "clear_orders_payments",
  "format_reset",
];

function isCleanupResult(value: unknown): value is CleanupResult {
  return Boolean(
    value &&
      typeof value === "object" &&
      "ok" in value &&
      typeof (value as { ok: unknown }).ok === "boolean",
  );
}

export function StorageCleanupPanel() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<CleanupActionId | null>(null);
  const [preview, setPreview] = useState<CleanupPreview | null>(null);
  const [phrase, setPhrase] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!active) {
      setPreview(null);
      setPhrase("");
      setError(null);
      return;
    }
    let cancelled = false;
    setLoadingPreview(true);
    setError(null);
    void previewCleanupAction(active).then((res) => {
      if (cancelled) return;
      setLoadingPreview(false);
      if (!res.ok) {
        setError(res.error);
        setPreview(null);
        return;
      }
      setPreview(res.preview);
    });
    return () => {
      cancelled = true;
    };
  }, [active]);

  function closeDialog() {
    if (pending) return;
    setActive(null);
  }

  function runCleanup() {
    if (!active || !preview) return;
    setError(null);
    startTransition(async () => {
      const result = await executeCleanupAction({
        action: active,
        confirmPhrase: phrase,
      });
      if (!isCleanupResult(result)) {
        setError("Cleanup failed unexpectedly.");
        return;
      }
      if (!result.ok) {
        setError(result.error ?? "Cleanup failed.");
        return;
      }
      setSuccess(result.message ?? "Cleanup completed.");
      setActive(null);
      router.refresh();
    });
  }

  const required = active ? CONFIRM_PHRASES[active] : "";
  const phraseOk = phrase.trim().toUpperCase() === required;

  return (
    <div className={cn(adminCard(), "p-4")}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-[color-mix(in_srgb,var(--color-warning)_14%,transparent)] p-2 text-[var(--color-warning)]">
          <WarningAmberOutlinedIcon sx={{ fontSize: 20 }} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-semibold tracking-tight text-[var(--color-foreground)]">
            Storage cleanup
          </h3>
          <p className="mt-0.5 text-[12px] leading-snug text-[var(--color-muted)]">
            Super Admin only. Frees database and file storage without dropping
            tables. Store branding, payment credentials, team, and system roles
            are never deleted.
          </p>
        </div>
      </div>

      {success ? (
        <p className="mt-3 rounded-lg border border-[color-mix(in_srgb,var(--color-success)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_10%,var(--color-card))] px-3 py-2 text-[12px] text-[var(--color-foreground)]">
          {success}
        </p>
      ) : null}

      <ul className="mt-4 space-y-2">
        {ACTIONS.map((action) => {
          const meta = ACTION_META[action];
          const danger = action === "format_reset";
          return (
            <li
              key={action}
              className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_40%,var(--color-card))] px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[var(--color-foreground)]">
                  {meta.title}
                </p>
                <p className="mt-0.5 text-[12px] leading-snug text-[var(--color-muted)]">
                  {meta.description}
                </p>
              </div>
              <button
                type="button"
                className={cn(
                  adminBtn(danger ? "primary" : "outline"),
                  "shrink-0",
                  danger && "!bg-[var(--color-error)]",
                )}
                onClick={() => {
                  setSuccess(null);
                  setActive(action);
                }}
              >
                {danger ? "Format reset…" : "Clear…"}
              </button>
            </li>
          );
        })}
      </ul>

      <AdminDialog
        open={Boolean(active)}
        onClose={closeDialog}
        title={preview?.title ?? ACTION_META[active ?? "format_reset"].title}
        description="This cannot be undone. Review what will be deleted, then type the confirmation word."
        maxWidth="sm"
        pending={pending || loadingPreview}
        icon={
          <WarningAmberOutlinedIcon
            sx={{ fontSize: 22, color: "var(--color-error)" }}
          />
        }
        actions={
          <>
            <button
              type="button"
              className={adminBtn("outline")}
              disabled={pending}
              onClick={closeDialog}
            >
              Cancel
            </button>
            <button
              type="button"
              className={cn(adminBtn("primary"), "!bg-[var(--color-error)]")}
              disabled={pending || loadingPreview || !phraseOk}
              onClick={runCleanup}
            >
              {pending ? "Working…" : "Confirm cleanup"}
            </button>
          </>
        }
      >
        {loadingPreview ? (
          <p className="text-[13px] text-[var(--color-muted)]">
            Counting rows…
          </p>
        ) : null}

        {error ? (
          <p className="mb-3 text-[13px] text-[var(--color-error)]">{error}</p>
        ) : null}

        {preview ? (
          <div className="space-y-3">
            <p className="text-[13px] leading-relaxed text-[var(--color-muted)]">
              {preview.description}
            </p>

            <div className="max-h-40 overflow-auto rounded-lg border border-[var(--color-border)]">
              <table className="w-full text-left text-[12px]">
                <thead className="sticky top-0 bg-[var(--color-card)] text-[var(--color-muted)]">
                  <tr>
                    <th className="px-3 py-1.5 font-medium">Data</th>
                    <th className="px-3 py-1.5 text-right font-medium">Rows</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.tables.map((row) => (
                    <tr
                      key={row.table}
                      className="border-t border-[var(--color-border)]"
                    >
                      <td className="px-3 py-1.5 text-[var(--color-foreground)]">
                        {row.label}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-[var(--color-foreground)]">
                        {row.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.storageBuckets.length > 0 ? (
              <p className="text-[12px] text-[var(--color-muted)]">
                Storage folders:{" "}
                {preview.storageBuckets.map((b) => b.label).join(", ")}
              </p>
            ) : null}

            <ul className="list-disc space-y-1 pl-4 text-[12px] text-[var(--color-muted)]">
              {preview.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>

            <TextField
              label={`Type ${preview.confirmPhrase} to confirm`}
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              fullWidth
              size="small"
              autoComplete="off"
              disabled={pending}
              slotProps={{
                htmlInput: {
                  "aria-label": `Type ${preview.confirmPhrase} to confirm`,
                },
              }}
            />
          </div>
        ) : null}
      </AdminDialog>
    </div>
  );
}
