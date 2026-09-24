import {
  PERMISSION_AREA_LABELS,
  type PermissionAreaId,
} from "@/features/auth/permission-matrix";
import {
  type Permission,
} from "@/features/auth/permissions";
import { grantablePermissionsForCustomRoles } from "@/features/admin/team/role-menu-access";

const VERB_LABEL: Record<string, string> = {
  view: "View",
  create: "Create",
  update: "Update",
  delete: "Delete",
  upload: "Upload",
  publish: "Publish",
  moderate: "Moderate",
  manage: "Manage",
};

/** Options for AdminMultiSelect when building a custom role. */
export function customRolePermissionOptions(): Array<{
  id: string;
  label: string;
}> {
  return grantablePermissionsForCustomRoles().map((permission) => {
    const [areaRaw, action = ""] = permission.split(".");
    const area = areaRaw as PermissionAreaId;
    const areaLabel =
      area in PERMISSION_AREA_LABELS
        ? PERMISSION_AREA_LABELS[area]
        : areaRaw;
    const verb = VERB_LABEL[action] ?? action;
    return {
      id: permission,
      label: `${areaLabel} · ${verb}`,
    };
  });
}

export function filterGrantablePermissions(
  selected: string[],
): Permission[] {
  const allowed = new Set(grantablePermissionsForCustomRoles());
  return selected.filter((p): p is Permission => allowed.has(p as Permission));
}

export function slugifyCustomRoleCode(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return `custom_${base || "role"}`;
}
