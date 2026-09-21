"use client";

import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import {
  PERMISSION_MATRIX_VERBS,
  PERMISSION_VERB_LABELS,
  permissionMatrixForRoles,
} from "@/features/auth/permission-matrix";
import { cn } from "@/lib/cn";
import type { AdminRoleCode } from "@/types/database";

type AdminPermissionMatrixProps = {
  roles: AdminRoleCode[];
  className?: string;
  /** Limit height for dialogs. */
  compact?: boolean;
};

/** Read-only feature × verb preview for selected admin roles. */
export function AdminPermissionMatrix({
  roles,
  className,
  compact = true,
}: AdminPermissionMatrixProps) {
  const rows = permissionMatrixForRoles(roles);

  if (!roles.length) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--color-border)] px-3 py-4 text-center text-[12px] text-[var(--color-muted)]">
        Select a role to preview rights.
      </p>
    );
  }

  if (!rows.length) {
    return (
      <p className="text-[12px] text-[var(--color-muted)]">
        No permissions for these roles.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]",
        className,
      )}
    >
      <div
        className={cn(
          "overflow-auto",
          compact ? "max-h-52" : "max-h-80",
        )}
      >
        <table className="min-w-full border-collapse text-left text-[11px]">
          <thead className="sticky top-0 z-[1] bg-[var(--color-surface)]">
            <tr className="border-b border-[var(--color-border)] text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-muted)]">
              <th className="px-2.5 py-2 font-semibold">Area</th>
              {PERMISSION_MATRIX_VERBS.map((verb) => (
                <th
                  key={verb}
                  className="px-1.5 py-2 text-center font-semibold"
                >
                  {PERMISSION_VERB_LABELS[verb]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.area}
                className="border-b border-[var(--color-border)] last:border-b-0"
              >
                <td className="whitespace-nowrap px-2.5 py-1.5 font-medium text-[var(--color-foreground)]">
                  {row.label}
                </td>
                {PERMISSION_MATRIX_VERBS.map((verb) => {
                  const on = row.cells[verb];
                  return (
                    <td key={verb} className="px-1.5 py-1.5 text-center">
                      {on ? (
                        <span
                          className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] text-[var(--color-primary)]"
                          title={`${PERMISSION_VERB_LABELS[verb]} allowed`}
                        >
                          <CheckRoundedIcon sx={{ fontSize: 14 }} />
                        </span>
                      ) : (
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-border)]" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
