"use client";

import KeyOutlinedIcon from "@mui/icons-material/KeyOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import Dialog from "@mui/material/Dialog";
import { useEffect, useState, useTransition } from "react";
import { changePasswordAction } from "@/features/auth/actions";
import { PasswordField } from "@/features/auth/components/PasswordField";
import { adminBtn } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";

type AdminChangePasswordDialogProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * Premium change-password dialog for signed-in admin users.
 */
export function AdminChangePasswordDialog({
  open,
  onClose,
}: AdminChangePasswordDialogProps) {
  const [pending, startTransition] = useTransition();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCurrentPassword("");
    setPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccess(null);
  }, [open]);

  function close() {
    if (pending) return;
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={pending ? undefined : close}
      fullWidth
      maxWidth="xs"
      aria-labelledby="admin-change-password-title"
      slotProps={{
        paper: {
          className: "admin-form-dialog-paper",
          sx: {
            margin: 2,
            overflow: "hidden",
            borderRadius: "1.25rem",
            border: "1px solid var(--color-border)",
            backgroundColor: "var(--color-card)",
            backgroundImage: "none",
            boxShadow:
              "0 24px 48px color-mix(in srgb, var(--color-foreground) 16%, transparent)",
          },
        },
      }}
    >
      <div className="relative overflow-hidden border-b border-[var(--color-border)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--color-primary)_14%,var(--color-card)),var(--color-card)_58%)] px-5 pb-4 pt-5">
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]"
          aria-hidden
        />
        <div className="relative flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-card)] text-[var(--color-primary)] shadow-[0_1px_3px_color-mix(in_srgb,var(--color-foreground)_10%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--color-primary)_22%,var(--color-border))]">
            {success ? (
              <CheckCircleOutlinedIcon sx={{ fontSize: 26 }} />
            ) : (
              <KeyOutlinedIcon sx={{ fontSize: 26 }} />
            )}
          </div>
          <div className="min-w-0 pt-0.5">
            <h2
              id="admin-change-password-title"
              className="text-[1.125rem] font-semibold tracking-tight text-[var(--color-foreground)]"
            >
              {success ? "Password updated" : "Change Password"}
            </h2>
            <p className="mt-1 text-[13px] leading-snug text-[var(--color-muted)]">
              {success
                ? "Use your new password the next time you sign in."
                : "Keep your admin account secure with a strong password."}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-5 py-4">
        {error ? (
          <p
            className="rounded-xl border border-[color-mix(in_srgb,var(--color-error)_30%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-error)_8%,var(--color-card))] px-3 py-2 text-[13px] text-[var(--color-error)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="rounded-xl border border-[color-mix(in_srgb,var(--color-success)_28%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_10%,var(--color-card))] px-3.5 py-3 text-[13px] font-medium leading-snug text-[var(--color-foreground)]">
            {success}
          </p>
        ) : (
          <div className="admin-form-stack flex flex-col gap-5 rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-card))] px-3.5 pb-3.5 pt-4">
            <PasswordField
              size="small"
              fullWidth
              required
              label="Current password"
              autoComplete="current-password"
              value={currentPassword}
              disabled={pending}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
            <PasswordField
              size="small"
              fullWidth
              required
              label="New password"
              autoComplete="new-password"
              value={password}
              disabled={pending}
              helperText="At least 8 characters."
              onChange={(event) => setPassword(event.target.value)}
            />
            <PasswordField
              size="small"
              fullWidth
              required
              label="Confirm new password"
              autoComplete="new-password"
              value={confirmPassword}
              disabled={pending}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_45%,var(--color-card))] px-5 py-3">
        <button
          type="button"
          className={cn(adminBtn("secondary"), "!min-h-9 !px-3.5 !text-[13px]")}
          disabled={pending}
          onClick={close}
        >
          {success ? "Close" : "Cancel"}
        </button>
        {!success ? (
          <button
            type="button"
            className={cn(adminBtn("primary"), "!min-h-9 !px-3.5 !text-[13px]")}
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await changePasswordAction({
                  currentPassword,
                  password,
                  confirmPassword,
                });
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setSuccess(result.message ?? "Password updated.");
                setCurrentPassword("");
                setPassword("");
                setConfirmPassword("");
              });
            }}
          >
            {pending ? "Updating…" : "Update Password"}
          </button>
        ) : null}
      </div>
    </Dialog>
  );
}
