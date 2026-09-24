import {
  ADMIN_NAV_SECTION_LABELS,
  ADMIN_NAV_TREE,
  type AdminNavLink,
  type AdminNavSection,
} from "@/features/admin/nav";
import {
  PERMISSIONS,
  type Permission,
} from "@/features/auth/permissions";
import {
  ensureDefaultUiCapabilities,
  pruneUiCapabilities,
} from "@/features/admin/team/role-ui-capabilities";

export type MenuAccessLevel = "full" | "read" | "hidden";

export type RoleMenuAccessItem = {
  id: string;
  label: string;
  section: AdminNavSection;
  sectionLabel: string;
  level: MenuAccessLevel;
};

const MUTATE_ACTIONS = new Set([
  "create",
  "update",
  "delete",
  "upload",
  "publish",
  "moderate",
  "manage",
]);

/** Friendly labels for permission verbs shown in the role editor. */
export const PERMISSION_ACTION_LABEL: Record<string, string> = {
  view: "View",
  create: "Create",
  update: "Update",
  delete: "Delete",
  upload: "Upload",
  publish: "Publish",
  moderate: "Moderate",
  manage: "Manage",
};

/** Preferred verb order in the UI. */
const ACTION_ORDER = [
  "view",
  "create",
  "update",
  "delete",
  "upload",
  "publish",
  "moderate",
  "manage",
];

function flattenNavLinks(): Array<AdminNavLink & { section: AdminNavSection }> {
  const links: Array<AdminNavLink & { section: AdminNavSection }> = [];
  for (const entry of ADMIN_NAV_TREE) {
    if (entry.kind === "link") {
      links.push({
        ...entry,
        section: entry.section ?? "main",
      });
      continue;
    }
    const section = entry.section ?? "main";
    for (const child of entry.children) {
      links.push({ ...child, section: child.section ?? section });
    }
  }
  return links;
}

function areasFromViewPermissions(viewPerms: Permission[]): string[] {
  const areas = new Set<string>();
  for (const perm of viewPerms) {
    const area = perm.split(".")[0];
    if (area) areas.add(area);
  }
  return [...areas].sort();
}

function hasMutateForAreas(
  granted: Set<Permission>,
  areas: string[],
): boolean {
  for (const permission of granted) {
    const [area, action] = permission.split(".");
    if (!area || !action) continue;
    if (!areas.includes(area)) continue;
    if (MUTATE_ACTIONS.has(action)) return true;
  }
  return false;
}

/** Classify each sidebar menu as Full / Read / Hidden for a permission set. */
export function menuAccessForPermissions(
  granted: Iterable<Permission> | Set<Permission>,
): RoleMenuAccessItem[] {
  const set =
    granted instanceof Set ? (granted as Set<Permission>) : new Set(granted);

  return flattenNavLinks().map((link) => {
    const canSee = link.permissions.some((p) => set.has(p));
    if (!canSee) {
      return {
        id: link.id,
        label: link.label.replace(/^All /, ""),
        section: link.section,
        sectionLabel: ADMIN_NAV_SECTION_LABELS[link.section],
        level: "hidden" as const,
      };
    }
    const areas = areasFromViewPermissions(link.permissions);
    const full = hasMutateForAreas(set, areas);
    return {
      id: link.id,
      label: link.label.replace(/^All /, ""),
      section: link.section,
      sectionLabel: ADMIN_NAV_SECTION_LABELS[link.section],
      level: full ? ("full" as const) : ("read" as const),
    };
  });
}

export const MENU_ACCESS_LEVEL_LABEL: Record<MenuAccessLevel, string> = {
  full: "Full",
  read: "Read",
  hidden: "Hidden",
};

/** Permissions Super Admin may grant on custom roles (no Team / audit). */
export const CUSTOM_ROLE_EXCLUDED_PERMISSIONS = new Set<Permission>([
  "users.view",
  "users.manage",
  "audit.view",
]);

export function grantablePermissionsForCustomRoles(): Permission[] {
  return PERMISSIONS.filter((p) => !CUSTOM_ROLE_EXCLUDED_PERMISSIONS.has(p));
}

export type MenuActionOption = {
  /** Stable id for the chip (usually the verb). */
  id: string;
  verb: string;
  label: string;
  /** All permission strings this chip grants/revokes together. */
  permissions: Permission[];
};

/** One editor row = unique capability set (menus that share the same areas). */
export type MenuAccessEditorRow = {
  id: string;
  label: string;
  /** Sidebar labels covered by this capability. */
  menus: string[];
  section: AdminNavSection;
  sectionLabel: string;
  areas: string[];
  viewPermissions: Permission[];
  /** Actions available for these areas (view, create, update, …). */
  actions: MenuActionOption[];
};

/** Hub links — covered by leaf pages with the same areas. */
const EDITOR_SKIP_LINK_IDS = new Set(["settings-hub"]);

function isEditableCustomRoleLink(
  link: AdminNavLink & { section: AdminNavSection },
): boolean {
  if (EDITOR_SKIP_LINK_IDS.has(link.id)) return false;
  if (!link.permissions.length) return false;
  return link.permissions.every(
    (p) => !CUSTOM_ROLE_EXCLUDED_PERMISSIONS.has(p),
  );
}

function actionsForAreas(areas: string[]): MenuActionOption[] {
  const grantable = grantablePermissionsForCustomRoles();
  const byVerb = new Map<string, Permission[]>();
  for (const permission of grantable) {
    const [area, verb] = permission.split(".");
    if (!area || !verb || !areas.includes(area)) continue;
    const list = byVerb.get(verb) ?? [];
    list.push(permission);
    byVerb.set(verb, list);
  }
  return ACTION_ORDER.filter((verb) => byVerb.has(verb)).map((verb) => ({
    id: verb,
    verb,
    label: PERMISSION_ACTION_LABEL[verb] ?? verb,
    permissions: byVerb.get(verb) ?? [],
  }));
}

function formatRowLabel(menus: string[]): string {
  if (menus.length === 1) return menus[0]!;
  if (menus.length === 2) return `${menus[0]} · ${menus[1]}`;
  return `${menus[0]} · +${menus.length - 1} more`;
}

/**
 * Capability rows for the custom-role editor.
 * Menus that share the same permission areas are merged (one set of actions).
 */
export function menuAccessEditorRows(): MenuAccessEditorRow[] {
  const byKey = new Map<
    string,
    {
      areas: string[];
      section: AdminNavSection;
      sectionLabel: string;
      viewPermissions: Set<Permission>;
      menus: string[];
    }
  >();

  for (const link of flattenNavLinks().filter(isEditableCustomRoleLink)) {
    const areas = areasFromViewPermissions(link.permissions);
    const key = areas.join("|");
    const label = link.label.replace(/^All /, "");
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        areas,
        section: link.section,
        sectionLabel: ADMIN_NAV_SECTION_LABELS[link.section],
        viewPermissions: new Set(link.permissions),
        menus: [label],
      });
      continue;
    }
    if (!existing.menus.includes(label)) existing.menus.push(label);
    for (const p of link.permissions) existing.viewPermissions.add(p);
  }

  return [...byKey.entries()].map(([id, row]) => ({
    id,
    label: formatRowLabel(row.menus),
    menus: row.menus,
    section: row.section,
    sectionLabel: row.sectionLabel,
    areas: row.areas,
    viewPermissions: [...row.viewPermissions],
    actions: actionsForAreas(row.areas),
  }));
}

/**
 * Toggle one action chip. Enabling Create/Update/… also turns on View.
 * Turning off View clears every action on this row.
 */
export function toggleRowAction(
  selected: Set<Permission>,
  row: MenuAccessEditorRow,
  actionId: string,
  enabled: boolean,
): Set<Permission> {
  const action = row.actions.find((item) => item.id === actionId);
  if (!action) return selected;
  const next = new Set(selected);

  if (enabled) {
    for (const permission of action.permissions) next.add(permission);
    if (action.verb !== "view") {
      const view = row.actions.find((item) => item.verb === "view");
      if (view) {
        for (const permission of view.permissions) next.add(permission);
      }
    }
    return ensureDefaultUiCapabilities(next);
  }

  for (const permission of action.permissions) next.delete(permission);
  if (action.verb === "view") {
    for (const item of row.actions) {
      for (const permission of item.permissions) next.delete(permission);
    }
  }
  return pruneUiCapabilities(next);
}

export function setRowPreset(
  selected: Set<Permission>,
  row: MenuAccessEditorRow,
  preset: "all" | "view" | "none",
): Set<Permission> {
  const next = new Set(selected);
  for (const action of row.actions) {
    for (const permission of action.permissions) next.delete(permission);
  }
  if (preset === "none") return pruneUiCapabilities(next);
  if (preset === "view") {
    const view = row.actions.find((item) => item.verb === "view");
    if (view) {
      for (const permission of view.permissions) next.add(permission);
    }
    return ensureDefaultUiCapabilities(pruneUiCapabilities(next));
  }
  for (const action of row.actions) {
    for (const permission of action.permissions) next.add(permission);
  }
  return ensureDefaultUiCapabilities(pruneUiCapabilities(next));
}

export function isRowActionSelected(
  selected: Set<Permission>,
  action: MenuActionOption,
): boolean {
  return action.permissions.every((permission) => selected.has(permission));
}

export function rowSelectionSummary(
  selected: Set<Permission>,
  row: MenuAccessEditorRow,
): { level: MenuAccessLevel; actionLabels: string[] } {
  const active = row.actions.filter((action) =>
    isRowActionSelected(selected, action),
  );
  if (!active.length) {
    return { level: "hidden", actionLabels: [] };
  }
  const labels = active.map((action) => action.label);
  const onlyView = active.every((action) => action.verb === "view");
  return {
    level: onlyView ? "read" : "full",
    actionLabels: labels,
  };
}

export function permissionsFromSelection(
  selected: Iterable<Permission>,
): Permission[] {
  const allowed = new Set(grantablePermissionsForCustomRoles());
  return [...new Set(selected)].filter((p) => allowed.has(p)).sort();
}

export function selectionFromPermissions(
  granted: Iterable<Permission>,
): Set<Permission> {
  const allowed = new Set(grantablePermissionsForCustomRoles());
  const out = new Set<Permission>();
  for (const p of granted) {
    if (allowed.has(p)) out.add(p);
  }
  return out;
}

export function countSelectionByLevel(
  selected: Set<Permission>,
): Record<MenuAccessLevel, number> {
  const counts = { full: 0, read: 0, hidden: 0 };
  for (const row of menuAccessEditorRows()) {
    counts[rowSelectionSummary(selected, row).level] += 1;
  }
  return counts;
}
