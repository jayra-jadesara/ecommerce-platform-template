"use client";

import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import KeyOutlinedIcon from "@mui/icons-material/KeyOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import TextField from "@mui/material/TextField";
import { useEffect, useState, useTransition } from "react";
import { setCustomerPasswordAction } from "@/features/customers/actions";
import { AdminDialog } from "@/features/admin/ui/AdminDialog";
import { adminBtn } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";

type CustomerPasswordDialogProps = {
  open: boolean;
  customerName: string;
  userId: string;
  onClose: () => void;
  onPasswordSet: (userId: string, password: string) => void;
};

function makeSupportPassword(): string {
  const alphabet =
    "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes =
    typeof crypto !== "undefined" && "getRandomValues" in crypto
      ? crypto.getRandomValues(new Uint8Array(12))
      : Uint8Array.from({ length: 12 }, () => Math.floor(Math.random() * 256));
  let out = "";
  for (const byte of bytes) {
    out += alphabet[byte % alphabet.length]!;
  }
  return out;
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Support password dialog — visible password + copy, one Save action.
 * Auth hashes are not readable; this always sets a new password.
 */
export function CustomerPasswordDialog({
  open,
  customerName,
  userId,
  onClose,
  onPasswordSet,
}: CustomerPasswordDialogProps) {
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPassword(makeSupportPassword());
    setError(null);
    setCopied(false);
    setSaved(false);
  }, [open, userId]);

  function close() {
    if (pending) return;
    onClose();
  }

  function saveAndCopy() {
    setError(null);
    const next = password.trim();
    if (next.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    startTransition(async () => {
      const result = await setCustomerPasswordAction({
        userId,
        password: next,
        generate: false,
      });
      if (!result.ok) {
        setError(result.error ?? "Unable to update password.");
        return;
      }
      const finalPassword = result.temporaryPassword ?? next;
      setPassword(finalPassword);
      onPasswordSet(userId, finalPassword);
      const ok = await copyText(finalPassword);
      setCopied(ok);
      setSaved(true);
    });
  }

  return (
    <AdminDialog
      open={open}
      onClose={close}
      title="Change customer password"
      description={`New password for ${customerName || "this customer"}. It is shown so you can copy it for support — then Save applies it.`}
      maxWidth="xs"
      pending={pending}
      icon={<KeyOutlinedIcon sx={{ fontSize: 22 }} />}
      actions={
        <>
          <button
            type="button"
            className={cn(adminBtn("secondary"), "!min-h-9 !px-3.5 !text-[13px]")}
            disabled={pending}
            onClick={close}
          >
            {saved ? "Done" : "Cancel"}
          </button>
          {!saved ? (
            <button
              type="button"
              className={cn(adminBtn("primary"), "!min-h-9 !px-3.5 !text-[13px]")}
              disabled={pending}
              onClick={saveAndCopy}
            >
              {pending ? "Saving…" : "Save & copy"}
            </button>
          ) : null}
        </>
      }
    >
      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        <TextField
          label="Password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setSaved(false);
            setCopied(false);
          }}
          disabled={pending}
          fullWidth
          size="small"
          autoComplete="off"
          helperText="Edit if you want, or use New for another random password."
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={cn(adminBtn("outline"), "!min-h-9 !px-3 !text-[13px]")}
            disabled={pending || !password}
            onClick={async () => {
              const ok = await copyText(password);
              setCopied(ok);
            }}
          >
            <ContentCopyOutlinedIcon sx={{ fontSize: 16 }} />
            <span className="ml-1.5">{copied ? "Copied" : "Copy"}</span>
          </button>
          <button
            type="button"
            className={cn(adminBtn("ghost"), "!min-h-9 !px-3 !text-[13px]")}
            disabled={pending || saved}
            onClick={() => {
              setPassword(makeSupportPassword());
              setCopied(false);
              setSaved(false);
            }}
          >
            <RefreshOutlinedIcon sx={{ fontSize: 16 }} />
            <span className="ml-1.5">New password</span>
          </button>
        </div>

        {saved ? (
          <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[12px] text-[var(--color-foreground)]">
            Password saved{copied ? " and copied" : ""}. Share it with the
            customer now.
          </p>
        ) : null}
      </div>
    </AdminDialog>
  );
}
