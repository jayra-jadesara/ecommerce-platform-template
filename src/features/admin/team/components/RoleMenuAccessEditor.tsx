"use client";

import {
  MENU_ACCESS_LEVEL_LABEL,
  countSelectionByLevel,
  isRowActionSelected,
  menuAccessEditorRows,
  rowSelectionSummary,
  setRowPreset,
  toggleRowAction,
  type MenuAccessEditorRow,
} from "@/features/admin/team/role-menu-access";
import {
  ROLE_UI_CAPABILITIES,
  capabilitiesForAreas,
  hasUiCapability,
  toggleUiCapability,
  type RoleUiCapability,
} from "@/features/admin/team/role-ui-capabilities";
import type { Permission } from "@/features/auth/permissions";
import { cn } from "@/lib/cn";

function groupBySection(rows: MenuAccessEditorRow[]) {
  const groups: Array<{
    section: MenuAccessEditorRow["section"];
    label: string;
    rows: MenuAccessEditorRow[];
  }> = [];
  const index = new Map<string, number>();
  for (const row of rows) {
    const key = row.section;
    const existing = index.get(key);
    if (existing === undefined) {
      index.set(key, groups.length);
      groups.push({
        section: row.section,
        label: row.sectionLabel,
        rows: [row],
      });
    } else {
      groups[existing]!.rows.push(row);
    }
  }
  return groups;
}

type RoleMenuAccessEditorProps = {
  value: Set<Permission>;
  onChange: (next: Set<Permission>) => void;
  disabled?: boolean;
};

function NestedPageDetails({
  caps,
  value,
  disabled,
  pageOn,
  onToggle,
}: {
  caps: RoleUiCapability[];
  value: Set<Permission>;
  disabled?: boolean;
  pageOn: boolean;
  onToggle: (cap: RoleUiCapability, enabled: boolean) => void;
}) {
  if (!caps.length) return null;
  const nestLabel = caps[0]!.nestLabel;

  return (
    <div
      className={cn(
        "mt-3 rounded-xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-card))] px-2.5 py-2",
        !pageOn && "opacity-60",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--color-muted)]">
        {nestLabel}
      </p>
      {!pageOn ? (
        <p className="mt-1 text-[10px] text-[var(--color-muted)]">
          Turn on View for this page first, then choose which cards to show.
        </p>
      ) : null}
      <ul className="mt-1.5 space-y-1">
        {caps.map((cap) => {
          const on = pageOn && hasUiCapability(value, cap);
          return (
            <li
              key={cap.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-1.5 py-1.5"
            >
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-[var(--color-foreground)]">
                  {cap.label}
                </p>
                <p className="text-[10px] text-[var(--color-muted)]">{cap.hint}</p>
              </div>
              <button
                type="button"
                disabled={disabled || !pageOn}
                aria-pressed={on}
                onClick={() => onToggle(cap, !on)}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition disabled:opacity-45",
                  on
                    ? "bg-[var(--color-primary)] text-[var(--color-button-foreground)]"
                    : "bg-[var(--color-card)] text-[var(--color-muted)] ring-1 ring-[var(--color-border)]",
                )}
              >
                {on ? "On" : "Off"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Per-page action chips; dashboard (and future) cards nest under their page.
 */
export function RoleMenuAccessEditor({
  value,
  onChange,
  disabled,
}: RoleMenuAccessEditorProps) {
  const rows = menuAccessEditorRows();
  const groups = groupBySection(rows);
  const counts = countSelectionByLevel(value);

  function setAction(
    row: MenuAccessEditorRow,
    actionId: string,
    enabled: boolean,
  ) {
    onChange(toggleRowAction(value, row, actionId, enabled));
  }

  function applyPreset(
    row: MenuAccessEditorRow,
    preset: "all" | "view" | "none",
  ) {
    onChange(setRowPreset(value, row, preset));
  }

  function setCapability(cap: RoleUiCapability, enabled: boolean) {
    const currentlyOn = hasUiCapability(value, cap);
    if (currentlyOn === enabled) return;

    // Legacy roles: page on but no card keys yet — materialize siblings first.
    let base = new Set(value);
    if (
      currentlyOn &&
      !value.has(cap.permission) &&
      value.has(cap.requires)
    ) {
      for (const sibling of ROLE_UI_CAPABILITIES.filter(
        (item) => item.nestUnderArea === cap.nestUnderArea,
      )) {
        base.add(sibling.permission);
      }
    }
    onChange(toggleUiCapability(base, cap, enabled));
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_10px_28px_color-mix(in_srgb,var(--color-foreground)_5%,transparent)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-primary)_7%,var(--color-card)),var(--color-card)_60%)] px-3.5 py-3">
        <div className="min-w-0 max-w-xl">
          <p className="text-[13px] font-semibold tracking-tight text-[var(--color-foreground)]">
            Page access
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-[var(--color-muted)]">
            Turn on actions for each admin page. Dashboard cards appear under
            Dashboard once View is on. Header, Footer, and Hosting use their own
            page rows. Team stays Super Admin only.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["full", counts.full, "Can edit"],
              ["read", counts.read, "View only"],
              ["hidden", counts.hidden, "Hidden"],
            ] as const
          ).map(([level, count, hint]) => (
            <span
              key={level}
              title={hint}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]",
                level === "full" &&
                  "bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] text-[var(--color-primary)]",
                level === "read" &&
                  "bg-[var(--color-surface)] text-[var(--color-foreground)] ring-1 ring-[var(--color-border)]",
                level === "hidden" &&
                  "bg-[var(--color-surface)] text-[var(--color-muted)]",
              )}
            >
              {MENU_ACCESS_LEVEL_LABEL[level]}
              <span className="tabular-nums opacity-80">{count}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-y-visible">
        {groups.map((group) => (
          <section
            key={group.section}
            className="border-b border-[var(--color-border)] last:border-b-0"
          >
            <div className="sticky top-0 z-[1] border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_92%,var(--color-card))] px-3.5 py-2 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
                {group.label}
              </p>
            </div>
            <ul className="divide-y divide-[var(--color-border)]">
              {group.rows.map((row) => {
                const summary = rowSelectionSummary(value, row);
                const nested = capabilitiesForAreas(row.areas);
                const pageOn = row.viewPermissions.some((p) => value.has(p));
                return (
                  <li key={row.id} className="px-3.5 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[var(--color-foreground)]">
                          {row.label}
                        </p>
                        <p className="mt-0.5 text-[10px] text-[var(--color-muted)]">
                          {summary.level === "hidden"
                            ? "Hidden from sidebar — no access"
                            : summary.actionLabels.join(" · ")}
                          {row.menus.length > 1 ? (
                            <span className="mt-0.5 block text-[10px] text-[var(--color-muted)]">
                              Affects: {row.menus.join(", ")}
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => applyPreset(row, "all")}
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-primary)] transition hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] disabled:opacity-50"
                        >
                          All
                        </button>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => applyPreset(row, "view")}
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)] disabled:opacity-50"
                        >
                          View only
                        </button>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => applyPreset(row, "none")}
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)] disabled:opacity-50"
                        >
                          None
                        </button>
                      </div>
                    </div>

                    <div
                      role="group"
                      aria-label={`${row.label} actions`}
                      className="mt-2.5 flex flex-wrap gap-1.5"
                    >
                      {row.actions.map((action) => {
                        const on = isRowActionSelected(value, action);
                        return (
                          <button
                            key={action.id}
                            type="button"
                            disabled={disabled}
                            aria-pressed={on}
                            onClick={() => setAction(row, action.id, !on)}
                            className={cn(
                              "rounded-full px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-50",
                              on
                                ? action.verb === "view"
                                  ? "bg-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-card))] text-[var(--color-primary)] ring-1 ring-[color-mix(in_srgb,var(--color-primary)_30%,transparent)]"
                                  : "bg-[var(--color-primary)] text-[var(--color-button-foreground)] shadow-sm"
                                : "bg-[var(--color-surface)] text-[var(--color-muted)] ring-1 ring-[var(--color-border)] hover:text-[var(--color-foreground)]",
                            )}
                          >
                            {action.label}
                          </button>
                        );
                      })}
                    </div>

                    <NestedPageDetails
                      caps={nested}
                      value={value}
                      disabled={disabled}
                      pageOn={pageOn}
                      onToggle={setCapability}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

export function emptyPermissionSelection(): Set<Permission> {
  return new Set();
}
