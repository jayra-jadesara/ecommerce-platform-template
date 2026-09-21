import type { StaffActivityItem } from "@/features/admin/team/types";

type AreaMatcher = (entityType: string) => boolean;

const AREA_MATCHERS: Record<string, AreaMatcher> = {
  catalog: (entityType) => /product|categor/i.test(entityType),
  media: (entityType) => /media/i.test(entityType),
  orders: (entityType) => /order|payment|coupon/i.test(entityType),
  settings: (entityType) =>
    /setting|brand|theme|header|footer|seo|nav/i.test(entityType),
  team: (entityType) => /admin_user|user/i.test(entityType),
  content: (entityType) => /cms|blog|page/i.test(entityType),
  errors: (entityType) => /error/i.test(entityType),
};

function matchesKnownArea(entityType: string): boolean {
  return Object.values(AREA_MATCHERS).some((match) => match(entityType));
}

/** Page-level activity tabs (admin areas). */
export const ACTIVITY_AREA_TABS = [
  { id: "all", label: "All", match: () => true },
  { id: "catalog", label: "Catalog", match: AREA_MATCHERS.catalog! },
  { id: "media", label: "Media", match: AREA_MATCHERS.media! },
  { id: "orders", label: "Orders", match: AREA_MATCHERS.orders! },
  { id: "settings", label: "Settings", match: AREA_MATCHERS.settings! },
  { id: "team", label: "Team", match: AREA_MATCHERS.team! },
  { id: "content", label: "Content", match: AREA_MATCHERS.content! },
  { id: "errors", label: "Errors", match: AREA_MATCHERS.errors! },
  {
    id: "other",
    label: "Other",
    match: (entityType: string) => !matchesKnownArea(entityType),
  },
] as const;

export type ActivityAreaId = (typeof ACTIVITY_AREA_TABS)[number]["id"];

export const ACTIVITY_RANGE_PRESETS = [
  { id: "7d", label: "7 days", days: 7 },
  { id: "14d", label: "14 days", days: 14 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "90d", label: "90 days", days: 90 },
] as const;

export type ActivityRangeId = (typeof ACTIVITY_RANGE_PRESETS)[number]["id"];

export type ActivityViewId = "overview" | "log";

export function isActivityAreaId(value: string): value is ActivityAreaId {
  return ACTIVITY_AREA_TABS.some((tab) => tab.id === value);
}

export function isActivityRangeId(value: string): value is ActivityRangeId {
  return ACTIVITY_RANGE_PRESETS.some((preset) => preset.id === value);
}

export function isActivityViewId(value: string): value is ActivityViewId {
  return value === "overview" || value === "log";
}

export function activityAreaForEntity(entityType: string): ActivityAreaId {
  for (const [id, match] of Object.entries(AREA_MATCHERS)) {
    if (match(entityType)) return id as ActivityAreaId;
  }
  return "other";
}

export function activityAreaLabel(areaId: ActivityAreaId): string {
  return ACTIVITY_AREA_TABS.find((tab) => tab.id === areaId)?.label ?? areaId;
}

export function filterItemsByArea(
  items: StaffActivityItem[],
  area: ActivityAreaId,
): StaffActivityItem[] {
  if (area === "all") return items;
  const tab = ACTIVITY_AREA_TABS.find((row) => row.id === area);
  if (!tab) return items;
  return items.filter((item) => tab.match(item.entityType));
}

export function entityTypesForArea(area: ActivityAreaId): string[] | null {
  if (area === "all" || area === "other") return null;
  const known: Record<Exclude<ActivityAreaId, "all" | "other">, string[]> = {
    catalog: ["products", "product_images", "categories"],
    media: ["media"],
    orders: ["order", "orders", "payment", "payments", "coupon", "coupons", "inventory"],
    settings: [
      "store_settings",
      "store_branding",
      "store_theme",
      "store_theme_settings",
      "store_header",
      "store_footer",
      "store_seo",
      "store_seo_settings",
      "store_navigation",
      "navigation_items",
      "shipping_settings",
      "payment_settings",
      "store_motion_3d_settings",
      "store_visual_effects_settings",
    ],
    team: ["admin_users"],
    content: ["cms", "blog_posts", "pages"],
    errors: ["error_log", "error_logs"],
  };
  return known[area] ?? null;
}
