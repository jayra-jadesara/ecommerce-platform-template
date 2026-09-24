"use client";

import {
  MENU_ACCESS_LEVEL_LABEL,
  menuAccessEditorRows,
  menuAccessForPermissions,
  type MenuAccessLevel,
  type RoleMenuAccessItem,
} from "@/features/admin/team/role-menu-access";
import {
  capabilitiesForAreas,
  hasUiCapability,
} from "@/features/admin/team/role-ui-capabilities";
import {
  ADMIN_NAV_SECTION_LABELS,
  type AdminNavSection,
} from "@/features/admin/nav";
import { cn } from "@/lib/cn";
import type { Permission } from "@/features/auth/permissions";

const SECTION_ORDER: AdminNavSection[] = [
  "main",
  "catalog",
  "sales",
  "content",
  "system",
  "store",
];

function levelTone(level: MenuAccessLevel): string {
  switch (level) {
    case "full":
      return "bg-[color-mix(in_srgb,var(--color-success)_14%,var(--color-card))] text-[var(--color-success)] ring-[color-mix(in_srgb,var(--color-success)_30%,var(--color-border))]";
    case "read":
      return "bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] text-[var(--color-primary)] ring-[color-mix(in_srgb,var(--color-primary)_26%,var(--color-border))]";
    case "hidden":
      return "bg-[var(--color-surface)] text-[var(--color-muted)] ring-[var(--color-border)]";
  }
}

function groupBySection(items: RoleMenuAccessItem[]) {
  const buckets = new Map<AdminNavSection, RoleMenuAccessItem[]>();
  for (const item of items) {
    const list = buckets.get(item.section) ?? [];
    list.push(item);
    buckets.set(item.section, list);
  }
  return SECTION_ORDER.flatMap((section) => {
    const rows = buckets.get(section);
    if (!rows?.length) return [];
    return [
      {
        section,
        label: ADMIN_NAV_SECTION_LABELS[section],
        rows,
      },
    ];
  });
}

/**
 * Per-menu Full / Read / Hidden breakdown for a permission set.
 * Dashboard cards nest under the Dashboard row (Edit Role preview).
 */
export function RoleMenuAccessList({
  permissions,
  compact = false,
  className,
  items: itemsProp,
}: {
  permissions?: Iterable<Permission> | Set<Permission>;
  items?: RoleMenuAccessItem[];
  compact?: boolean;
  className?: string;
}) {
  const items =
    itemsProp ??
    (permissions ? menuAccessForPermissions(permissions) : []);

  if (!items.length) {
    return (
      <p className="text-[12px] text-[var(--color-muted)]">
        No menu preview available.
      </p>
    );
  }

  const visible = items.filter((i) => i.level !== "hidden");
  const hidden = items.filter((i) => i.level === "hidden");
  const groups = groupBySection(visible);
  const fullCount = visible.filter((i) => i.level === "full").length;
  const readCount = visible.filter((i) => i.level === "read").length;
  const permSet =
    permissions instanceof Set
      ? (permissions as Set<Permission>)
      : new Set<Permission>(
          permissions
            ? [...permissions].filter((p): p is Permission => Boolean(p))
            : [],
        );

  const editorRows = menuAccessEditorRows();
  const areasByMenuLabel = new Map<string, string[]>();
  for (const row of editorRows) {
    for (const menu of row.menus) {
      areasByMenuLabel.set(menu, row.areas);
    }
    areasByMenuLabel.set(row.label, row.areas);
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
          "flex flex-wrap items-start justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)]",
          compact ? "px-2.5 py-2" : "px-3 py-2.5",
        )}
      >
        <div className="min-w-0">
          <p
            className={cn(
              "font-semibold text-[var(--color-foreground)]",
              compact ? "text-[11px]" : "text-[12px]",
            )}
          >
            Menu rights
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--color-muted)]">
            Full = edit · Read = view · Hidden = not in sidebar
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--color-success)_12%,var(--color-card))] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-[var(--color-success)]">
            Full <span className="tabular-nums opacity-80">{fullCount}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-card))] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-[var(--color-primary)]">
            Read <span className="tabular-nums opacity-80">{readCount}</span>
          </span>
          {hidden.length > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-card)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-[var(--color-muted)] ring-1 ring-[var(--color-border)]">
              Hidden{" "}
              <span className="tabular-nums opacity-80">{hidden.length}</span>
            </span>
          ) : null}
        </div>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {groups.map((group) => (
          <section
            key={group.section}
            className={compact ? "px-2.5 py-2" : "px-3 py-2.5"}
          >
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
              {group.label}
            </p>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {group.rows.map((item) => {
                const areas = areasByMenuLabel.get(item.label) ?? [];
                const nested = capabilitiesForAreas(areas).filter((cap) =>
                  permSet.has(cap.requires),
                );
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "ring-1",
                      compact
                        ? "rounded-lg px-2 py-1 text-[11px]"
                        : "rounded-lg px-2.5 py-1.5 text-[12px]",
                      levelTone(item.level),
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate font-medium text-[var(--color-foreground)]">
                        {item.label}
                      </span>
                      <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.06em]">
                        {MENU_ACCESS_LEVEL_LABEL[item.level]}
                      </span>
                    </div>
                    {nested.length > 0 ? (
                      <ul className="mt-1.5 flex flex-wrap gap-1 border-t border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] pt-1.5">
                        {nested.map((cap) => {
                          const on = hasUiCapability(permSet, cap);
                          return (
                            <li
                              key={cap.id}
                              className={cn(
                                "rounded-md px-1.5 py-0.5 text-[9px] font-semibold ring-1",
                                on
                                  ? "bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-card))] text-[var(--color-primary)] ring-[color-mix(in_srgb,var(--color-primary)_24%,var(--color-border))]"
                                  : "bg-[var(--color-card)] text-[var(--color-muted)] ring-[var(--color-border)] opacity-70",
                              )}
                              title={cap.hint}
                            >
                              {cap.label}
                              <span className="ml-1 font-normal opacity-80">
                                {on ? "On" : "Off"}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {hidden.length > 0 ? (
        <details className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2">
          <summary className="cursor-pointer text-[11px] font-semibold text-[var(--color-muted)]">
            Hidden menus ({hidden.length})
          </summary>
          <ul className="mt-1.5 flex flex-wrap gap-1 pb-0.5">
            {hidden.map((item) => (
              <li
                key={item.id}
                className="rounded-md bg-[var(--color-card)] px-1.5 py-0.5 text-[10px] text-[var(--color-muted)] ring-1 ring-[var(--color-border)]"
              >
                {item.label}
                <span className="ml-1 opacity-70">· {item.sectionLabel}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
