"use client";

import KeyOutlinedIcon from "@mui/icons-material/KeyOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import { useEffect, useState, useTransition } from "react";
import { changePasswordAction } from "@/features/auth/actions";
import { PasswordField } from "@/features/auth/components/PasswordField";
import { AdminDialog } from "@/features/admin/ui/AdminDialog";
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
    <AdminDialog
      open={open}
      onClose={close}
      title={success ? "Password updated" : "Change Password"}
      description={
        success
          ? "Use your new password the next time you sign in."
          : "Keep your admin account secure with a strong password."
      }
      maxWidth="xs"
      pending={pending}
      icon={
        success ? (
          <CheckCircleOutlinedIcon sx={{ fontSize: 22 }} />
        ) : (
          <KeyOutlinedIcon sx={{ fontSize: 22 }} />
        )
      }
      actions={
        <>
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
        </>
      }
    >
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
    </AdminDialog>
  );
}
