import "server-only";

import { revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentAdmin, hasPermission } from "@/features/auth/session";
import {
  navigationSettingsSchema,
  type NavigationItemFormValues,
} from "@/features/admin/settings/schemas";
import {
  resolveActiveStoreId,
  type SettingsUpdateResult,
} from "@/features/admin/settings/store-context";
import { STOREFRONT_CONFIG_CACHE_TAG } from "@/features/theme/service";

export type AdminNavItemRow = {
  id: string;
  location: "header" | "footer";
  parent_id: string | null;
  label: string;
  href: string;
  sort_order: number;
  is_active: boolean;
  open_in_new_tab: boolean;
};

export async function loadAdminNavigationItems(): Promise<AdminNavItemRow[]> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "navigation.view")) return [];

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return [];

  const { data, error } = await supabase
    .from("navigation_items")
    .select(
      "id, location, parent_id, label, href, sort_order, is_active, open_in_new_tab",
    )
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data as AdminNavItemRow[];
}

export async function updateNavigationSettings(
  input: unknown,
): Promise<SettingsUpdateResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "navigation.update")) {
    return {
      ok: false,
      error: "You do not have permission to update navigation.",
    };
  }

  const parsed = navigationSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid navigation settings.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return { ok: false, error: "No active store found." };

  const items = parsed.data.items;
  const toDelete = items.filter((item) => item._delete && item.id);
  const toPersist = items.filter((item) => !item._delete);

  for (const item of toPersist) {
    if (item.id && item.parentId === item.id) {
      return { ok: false, error: "A navigation item cannot be its own parent." };
    }
  }

  for (const item of toDelete) {
    if (!item.id) continue;
    const { error } = await supabase
      .from("navigation_items")
      .delete()
      .eq("id", item.id)
      .eq("store_id", storeId);
    if (error) {
      return {
        ok: false,
        error: "Unable to delete a navigation item. Try again.",
      };
    }
  }

  const clientKeyToId = new Map<string, string>();
  for (const item of toPersist) {
    if (item.id) clientKeyToId.set(item.clientKey, item.id);
  }

  let createdCount = 0;

  async function writeItem(
    item: NavigationItemFormValues,
  ): Promise<string | null> {
    let parentId = item.parentId;
    if (!parentId && item.parentClientKey) {
      parentId = clientKeyToId.get(item.parentClientKey) ?? null;
    }

    const payload = {
      store_id: storeId!,
      location: item.location,
      parent_id: parentId,
      label: item.label.trim(),
      href: item.href.trim(),
      sort_order: item.sortOrder,
      is_active: item.isActive,
      open_in_new_tab: item.openInNewTab,
    };

    if (item.id) {
      const { error } = await supabase
        .from("navigation_items")
        .update(payload)
        .eq("id", item.id)
        .eq("store_id", storeId!);
      if (error) return null;
      return item.id;
    }

    const { data, error } = await supabase
      .from("navigation_items")
      .insert(payload)
      .select("id")
      .single();
    if (error || !data) return null;
    createdCount += 1;
    clientKeyToId.set(item.clientKey, data.id);
    return data.id;
  }

  // Roots (no parent) first, then nested items (may depend on newly created parents).
  const roots = toPersist.filter(
    (item) => !item.parentId && !item.parentClientKey,
  );
  const nested = toPersist.filter(
    (item) => Boolean(item.parentId || item.parentClientKey),
  );

  for (const item of roots) {
    const id = await writeItem(item);
    if (!id) {
      return {
        ok: false,
        error:
          "Unable to save navigation items. Check permissions and try again.",
      };
    }
  }

  for (const item of nested) {
    const id = await writeItem(item);
    if (!id) {
      return {
        ok: false,
        error: "Unable to save nested navigation items.",
      };
    }
  }

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "NAVIGATION_UPDATED",
    entity_type: "navigation_items",
    entity_id: storeId,
    metadata: {
      changed_fields: ["navigation_items"],
      item_count: toPersist.length,
      deleted_count: toDelete.length,
      created_count: createdCount,
    },
  });

  revalidateTag(STOREFRONT_CONFIG_CACHE_TAG, "max");
  return { ok: true, message: "Navigation saved." };
}
