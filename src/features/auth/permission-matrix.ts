import {
  permissionsForRoles,
  type Permission,
} from "@/features/auth/permissions";
import type { AdminRoleCode } from "@/types/database";

export type PermissionVerb =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "upload"
  | "other";

export const PERMISSION_MATRIX_VERBS: PermissionVerb[] = [
  "view",
  "create",
  "update",
  "delete",
  "upload",
  "other",
];

export const PERMISSION_VERB_LABELS: Record<PermissionVerb, string> = {
  view: "View",
  create: "Create",
  update: "Update",
  delete: "Delete",
  upload: "Upload",
  other: "Other",
};

export type PermissionAreaId =
  | "dashboard"
  | "products"
  | "reviews"
  | "categories"
  | "inventory"
  | "orders"
  | "customers"
  | "cms"
  | "content"
  | "media"
  | "product_images"
  | "settings"
  | "branding"
  | "navigation"
  | "seo"
  | "theme"
  | "shipping"
  | "payments"
  | "coupons"
  | "blog"
  | "users"
  | "audit"
  | "error_logs";

export const PERMISSION_AREA_LABELS: Record<PermissionAreaId, string> = {
  dashboard: "Dashboard",
  products: "Products",
  reviews: "Reviews",
  categories: "Categories",
  inventory: "Inventory",
  orders: "Orders",
  customers: "Customers",
  cms: "CMS",
  content: "Content",
  media: "Media",
  product_images: "Product images",
  settings: "Settings",
  branding: "Branding",
  navigation: "Navigation",
  seo: "SEO",
  theme: "Appearance",
  shipping: "Shipping",
  payments: "Payments",
  coupons: "Coupons",
  blog: "Blog",
  users: "Team",
  audit: "Audit",
  error_logs: "Error logs",
};

const AREA_ORDER: PermissionAreaId[] = [
  "dashboard",
  "products",
  "categories",
  "inventory",
  "reviews",
  "orders",
  "customers",
  "media",
  "product_images",
  "cms",
  "content",
  "blog",
  "branding",
  "theme",
  "navigation",
  "settings",
  "shipping",
  "payments",
  "coupons",
  "seo",
  "users",
  "audit",
  "error_logs",
];

export type PermissionMatrixCell = Record<PermissionVerb, boolean>;

export type PermissionMatrixRow = {
  area: PermissionAreaId;
  label: string;
  cells: PermissionMatrixCell;
};

function verbForPermission(permission: Permission): {
  area: PermissionAreaId;
  verb: PermissionVerb;
} | null {
  const [areaRaw, action] = permission.split(".") as [string, string];
  const area = areaRaw as PermissionAreaId;
  if (!(area in PERMISSION_AREA_LABELS)) return null;

  switch (action) {
    case "view":
      return { area, verb: "view" };
    case "create":
      return { area, verb: "create" };
    case "update":
      return { area, verb: "update" };
    case "delete":
      return { area, verb: "delete" };
    case "upload":
      return { area, verb: "upload" };
    default:
      return { area, verb: "other" };
  }
}

function emptyCells(): PermissionMatrixCell {
  return {
    view: false,
    create: false,
    update: false,
    delete: false,
    upload: false,
    other: false,
  };
}

/** Read-only matrix of feature × verb for the union of selected roles. */
export function permissionMatrixForRoles(
  roles: AdminRoleCode[],
): PermissionMatrixRow[] {
  const granted = permissionsForRoles(roles);
  const byArea = new Map<PermissionAreaId, PermissionMatrixCell>();

  for (const permission of granted) {
    const parsed = verbForPermission(permission);
    if (!parsed) continue;
    const cells = byArea.get(parsed.area) ?? emptyCells();
    cells[parsed.verb] = true;
    byArea.set(parsed.area, cells);
  }

  return AREA_ORDER.filter((area) => byArea.has(area)).map((area) => ({
    area,
    label: PERMISSION_AREA_LABELS[area],
    cells: byArea.get(area) ?? emptyCells(),
  }));
}
