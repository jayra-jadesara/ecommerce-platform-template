"use client";

import {
  ROLE_QUICK,
  roleOptionDescription,
  roleOptionLabel,
  roleOptionLevel,
  roleSidebarSections,
} from "@/features/admin/team/role-summaries";
import { STAFF_ROLE_OPTIONS } from "@/features/admin/team/types";
import { ADMIN_NAV_SECTION_LABELS, type AdminNavSection } from "@/features/admin/nav";
import { AdminRadio } from "@/features/admin/ui/AdminRadio";
import { cn } from "@/lib/cn";
import type { AdminRoleCode } from "@/types/database";

export type AdminRolePerson = {
  name?: string | null;
  email?: string | null;
  /** Role currently saved on the account (before this edit). */
  currentRoleLabel?: string | null;
};

type AdminRoleSummaryProps = {
  value: AdminRoleCode | null;
  onChange: (role: AdminRoleCode) => void;
  disabled?: boolean;
  allowSuperAdmin?: boolean;
  name?: string;
  className?: string;
  person?: AdminRolePerson | null;
  /** Denser layout for dialogs that must fit without page scroll. */
  compact?: boolean;
};

const SECTION_ORDER: AdminNavSection[] = [
  "main",
  "catalog",
  "sales",
  "content",
  "store",
];

/**
 * Premium split role picker: roles rail + access preview panel.
 */
export function AdminRoleSummary({
  value,
  onChange,
  disabled,
  allowSuperAdmin = true,
  name = "staff-role",
  className,
  person = null,
  compact = false,
}: AdminRoleSummaryProps) {
  const options = STAFF_ROLE_OPTIONS.filter(
    (option) => allowSuperAdmin || option.value !== "SUPER_ADMIN",
  );
  const selected = value
    ? (options.find((option) => option.value === value) ?? null)
    : null;
  const quick = value ? ROLE_QUICK[value] : null;
  const openSections = new Set(value ? roleSidebarSections(value) : []);
  const personName = person?.name?.trim() || null;
  const personEmail = person?.email?.trim() || null;
  const personInitials = (personName || personEmail || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");

  return (
    <div className={cn(className)}>
      <div
        className={cn(
          "overflow-hidden border border-[var(--color-border)] bg-[var(--color-card)]",
          compact
            ? "rounded-xl shadow-none"
            : "rounded-2xl shadow-[0_8px_28px_color-mix(in_srgb,var(--color-foreground)_6%,transparent)]",
        )}
      >
        <div
          className={cn(
            "grid",
            compact
              ? "sm:grid-cols-[11.5rem_minmax(0,1fr)]"
              : "sm:grid-cols-[13.5rem_minmax(0,1fr)]",
          )}
        >
          <fieldset
            disabled={disabled}
            className={cn(
              "bg-[color-mix(in_srgb,var(--color-surface)_78%,var(--color-card))]",
              !compact && "sm:min-h-[20rem]",
            )}
          >
            <legend className="sr-only">Job role</legend>
            <div className={cn(compact ? "px-2.5 pb-1 pt-2" : "px-3.5 pb-2 pt-3.5")}>
              <p className="text-[11px] font-semibold tracking-tight text-[var(--color-foreground)]">
                Choose role
              </p>
              {!compact ? (
                <p className="mt-0.5 text-[10px] leading-snug text-[var(--color-muted)]">
                  Most access → least
                </p>
              ) : null}
            </div>
            <ul className={cn("px-1.5 pb-2", compact ? "space-y-0" : "space-y-0.5 px-2 pb-3")}>
              {options.map((option, index) => {
                const checked = value === option.value;
                return (
                  <li key={option.value}>
                    <label
                      className={cn(
                        "relative flex cursor-pointer items-center transition",
                        compact
                          ? "gap-1.5 rounded-lg px-2 py-1.5"
                          : "gap-2.5 rounded-xl px-2.5 py-2.5",
                        checked
                          ? "bg-[var(--color-card)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-primary)_28%,var(--color-border))]"
                          : "hover:bg-[color-mix(in_srgb,var(--color-card)_70%,transparent)]",
                        disabled && "pointer-events-none opacity-55",
                      )}
                    >
                      {checked ? (
                        <span
                          className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-[var(--color-primary)]"
                          aria-hidden
                        />
                      ) : null}
                      {!compact ? (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[9px] font-bold tabular-nums text-[var(--color-muted)]">
                          {index + 1}
                        </span>
                      ) : null}
                      <AdminRadio
                        name={name}
                        value={option.value}
                        checked={checked}
                        disabled={disabled}
                        size="sm"
                        onChange={() => onChange(option.value)}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block font-semibold leading-tight text-[var(--color-foreground)]",
                            compact ? "text-[12px]" : "text-[13px]",
                          )}
                        >
                          {option.label}
                        </span>
                        {!compact ? (
                          <span className="mt-0.5 block text-[10px] text-[var(--color-muted)]">
                            {option.level}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>

          <div className="flex flex-col border-t border-[var(--color-border)] sm:border-l sm:border-t-0">
            {personName || personEmail ? (
              <div
                className={cn(
                  "flex items-center gap-2.5 border-b border-[var(--color-border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-primary)_8%,var(--color-card)),var(--color-card)_55%)]",
                  compact ? "px-3 py-2" : "gap-3 px-4 py-3.5",
                )}
              >
                <div
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-xl bg-[var(--color-card)] font-bold text-[var(--color-primary)] ring-1 ring-[color-mix(in_srgb,var(--color-primary)_20%,var(--color-border))]",
                    compact ? "h-8 w-8 text-[11px]" : "h-11 w-11 rounded-2xl text-[13px]",
                  )}
                  aria-hidden
                >
                  {personInitials || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate font-semibold tracking-tight text-[var(--color-foreground)]",
                      compact ? "text-[13px]" : "text-[15px]",
                    )}
                  >
                    {personName || personEmail}
                  </p>
                  {personName && personEmail && !compact ? (
                    <p className="truncate text-[12px] text-[var(--color-muted)]">
                      {personEmail}
                    </p>
                  ) : null}
                </div>
                {person?.currentRoleLabel ? (
                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
                      Now
                    </p>
                    <p className="text-[12px] font-semibold text-[var(--color-foreground)]">
                      {person.currentRoleLabel}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div
              className={cn(
                "flex flex-1 flex-col",
                compact ? "gap-2.5 p-2.5" : "gap-4 p-4",
              )}
            >
              {selected && quick ? (
                <>
                  <div>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3
                        className={cn(
                          "font-semibold tracking-tight text-[var(--color-foreground)]",
                          compact ? "text-[15px]" : "text-[18px]",
                        )}
                      >
                        {roleOptionLabel(selected.value)}
                      </h3>
                      <span className="rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--color-primary)]">
                        {roleOptionLevel(selected.value)}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "mt-0.5 text-[var(--color-muted)]",
                        compact
                          ? "text-[11px] leading-snug"
                          : "max-w-md text-[13px] leading-relaxed",
                      )}
                    >
                      {roleOptionDescription(selected.value)}
                    </p>
                  </div>

                  <div className="grid gap-1.5 sm:grid-cols-2">
                    <div
                      className={cn(
                        "rounded-xl border border-[color-mix(in_srgb,var(--color-primary)_24%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-card))]",
                        compact ? "px-2.5 py-2" : "rounded-2xl px-3.5 py-3",
                      )}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-primary)]">
                        Can do
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 font-medium leading-snug text-[var(--color-foreground)]",
                          compact ? "text-[12px]" : "text-[13px]",
                        )}
                      >
                        {quick.can}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]",
                        compact ? "px-2.5 py-2" : "rounded-2xl px-3.5 py-3",
                      )}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
                        Cannot do
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 font-medium leading-snug text-[var(--color-foreground)]",
                          compact ? "text-[12px]" : "text-[13px]",
                        )}
                      >
                        {quick.cannot}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div
                      className={cn(
                        "mb-1.5 flex items-end justify-between gap-2",
                        !compact && "mb-2",
                      )}
                    >
                      <p
                        className={cn(
                          "font-semibold text-[var(--color-foreground)]",
                          compact ? "text-[11px]" : "text-[12px]",
                        )}
                      >
                        Sidebar access
                      </p>
                      {!compact ? (
                        <p className="text-[10px] text-[var(--color-muted)]">
                          On = visible · Off = hidden & blocked
                        </p>
                      ) : null}
                    </div>
                    <ul
                      className={cn(
                        "grid gap-1",
                        compact ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-2 gap-1.5 sm:grid-cols-3",
                      )}
                    >
                      {SECTION_ORDER.map((id) => {
                        const label = ADMIN_NAV_SECTION_LABELS[id];
                        const on = openSections.has(label);
                        return (
                          <li
                            key={id}
                            className={cn(
                              "flex items-center font-medium ring-1",
                              compact
                                ? "gap-1 rounded-lg px-1.5 py-1 text-[10px]"
                                : "gap-2 rounded-xl px-2.5 py-2 text-[12px]",
                              on
                                ? "bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-card))] text-[var(--color-foreground)] ring-[color-mix(in_srgb,var(--color-primary)_22%,var(--color-border))]"
                                : "bg-[var(--color-surface)] text-[var(--color-muted)] ring-[var(--color-border)] opacity-70",
                            )}
                          >
                            <span
                              className={cn(
                                "flex shrink-0 items-center justify-center rounded-full font-bold",
                                compact ? "h-3.5 w-3.5 text-[8px]" : "h-4 w-4 text-[9px]",
                                on
                                  ? "bg-[var(--color-primary)] text-[var(--color-card)]"
                                  : "bg-[var(--color-border)] text-[var(--color-muted)]",
                              )}
                              aria-hidden
                            >
                              {on ? "✓" : "–"}
                            </span>
                            {label}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </>
              ) : (
                <div className={cn("m-auto text-center", compact ? "py-6" : "max-w-[14rem] py-10")}>
                  <p className="text-[14px] font-semibold text-[var(--color-foreground)]">
                    Select a role
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-muted)]">
                    Access details appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
