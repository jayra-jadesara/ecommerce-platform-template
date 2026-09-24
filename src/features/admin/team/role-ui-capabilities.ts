import type { Permission } from "@/features/auth/permissions";

/**
 * Page-scoped UI details (widgets / cards) nested under a parent page row
 * in the role editor — not a separate “Cards” panel.
 */
export type RoleUiCapability = {
  id: string;
  permission: Permission;
  label: string;
  hint: string;
  /** Parent page View permission (e.g. dashboard.view). */
  requires: Permission;
  /** Match MenuAccessEditorRow.areas (e.g. "dashboard"). */
  nestUnderArea: string;
  /** Short subsection title under the page row. */
  nestLabel: string;
};

export const ROLE_UI_CAPABILITIES: RoleUiCapability[] = [
  {
    id: "dash-overview",
    permission: "dash_overview.view",
    label: "Overview metrics",
    hint: "Revenue, profit, orders, products, customers tiles",
    requires: "dashboard.view",
    nestUnderArea: "dashboard",
    nestLabel: "Dashboard cards",
  },
  {
    id: "dash-attention",
    permission: "dash_attention.view",
    label: "Needs attention",
    hint: "Orders to pack, low stock, reviews queue",
    requires: "dashboard.view",
    nestUnderArea: "dashboard",
    nestLabel: "Dashboard cards",
  },
  {
    id: "dash-recent",
    permission: "dash_recent.view",
    label: "Recent orders",
    hint: "Latest paid orders list on the dashboard",
    requires: "dashboard.view",
    nestUnderArea: "dashboard",
    nestLabel: "Dashboard cards",
  },
  {
    id: "dash-charts",
    permission: "dash_charts.view",
    label: "Performance charts",
    hint: "Store performance graphs and period totals",
    requires: "dashboard.view",
    nestUnderArea: "dashboard",
    nestLabel: "Dashboard cards",
  },
];

export const DASHBOARD_CARD_PERMISSIONS: Permission[] = ROLE_UI_CAPABILITIES.filter(
  (c) => c.nestUnderArea === "dashboard",
).map((c) => c.permission);

/** @deprecated Prefer nesting under page rows; kept for prune/seed helpers. */
export const SETTINGS_DETAIL_VIEW_PERMISSIONS: Permission[] = [
  "settings_header.view",
  "settings_footer.view",
  "platform.view",
];

/** Capabilities that belong under a given page-access row. */
export function capabilitiesForAreas(areas: string[]): RoleUiCapability[] {
  if (!areas.length) return [];
  const areaSet = new Set(areas);
  return ROLE_UI_CAPABILITIES.filter((cap) => areaSet.has(cap.nestUnderArea));
}

/**
 * Card visible if explicitly granted, or legacy (page access without any card grants).
 */
export function hasUiCapability(
  granted: Set<Permission> | Iterable<Permission>,
  capability: RoleUiCapability,
): boolean {
  const set = granted instanceof Set ? granted : new Set(granted);
  if (!set.has(capability.requires)) return false;
  if (set.has(capability.permission)) return true;

  const siblings = ROLE_UI_CAPABILITIES.filter(
    (c) => c.nestUnderArea === capability.nestUnderArea,
  ).map((c) => c.permission);
  const hasAnyExplicit = siblings.some((p) => set.has(p));
  // Legacy roles: page open, no card keys stored yet → show all cards for that page.
  return !hasAnyExplicit;
}

export function toggleUiCapability(
  selected: Set<Permission>,
  capability: RoleUiCapability,
  enabled: boolean,
): Set<Permission> {
  const next = new Set(selected);
  if (enabled) {
    next.add(capability.requires);
    next.add(capability.permission);
    return next;
  }
  next.delete(capability.permission);
  return next;
}

/** When Dashboard View is turned on, seed all dashboard cards by default. */
export function ensureDefaultUiCapabilities(
  selected: Set<Permission>,
): Set<Permission> {
  const next = new Set(selected);
  if (next.has("dashboard.view")) {
    for (const p of DASHBOARD_CARD_PERMISSIONS) next.add(p);
  }
  return next;
}

/** Drop dashboard card grants when Dashboard page access is removed. */
export function pruneUiCapabilities(selected: Set<Permission>): Set<Permission> {
  const next = new Set(selected);
  if (!next.has("dashboard.view")) {
    for (const p of DASHBOARD_CARD_PERMISSIONS) next.delete(p);
  }
  return next;
}
