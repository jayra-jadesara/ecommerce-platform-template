import "server-only";

import { revalidateTag } from "next/cache";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { getCurrentUser } from "@/features/auth/session";
import { writeBlogAudit } from "@/features/blog/audit";
import { STOREFRONT_BLOG_CACHE_TAG } from "@/features/blog/cache";
import {
  blogSettingsFormSchema,
  DEFAULT_BLOG_SETTINGS,
  type BlogSettingsFormValues,
} from "@/features/blog/schemas";
import {
  blogSettingsPayload,
  mapBlogSettingsRow,
} from "@/features/blog/settings-map";
import { normalizeSidebarPreset } from "@/features/blog/settings-normalize";
import type { BlogSettings } from "@/features/blog/types";
import { unexpectedFailure } from "@/features/error-monitoring/unexpected";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type BlogSettingsMutationResult =
  | { ok: true; settings: BlogSettings; message?: string }
  | { ok: false; error: string };

export async function loadAdminBlogSettings(): Promise<BlogSettings | null> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return null;

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("blog_settings")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle();

  if (existing) return mapBlogSettingsRow(existing);

  const defaults = DEFAULT_BLOG_SETTINGS;
  const { data, error } = await supabase
    .from("blog_settings")
    .insert({
      store_id: storeId,
      ...blogSettingsPayload(defaults),
    })
    .select("*")
    .single();

  if (error || !data) {
    const { data: again } = await supabase
      .from("blog_settings")
      .select("*")
      .eq("store_id", storeId)
      .maybeSingle();
    return again ? mapBlogSettingsRow(again) : null;
  }

  return mapBlogSettingsRow(data);
}

async function syncFeaturedPostFlag(
  storeId: string,
  featuredPostId: string | null,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("blog_posts")
    .update({ is_featured: false })
    .eq("store_id", storeId)
    .eq("is_featured", true);

  if (!featuredPostId) return;

  await supabase
    .from("blog_posts")
    .update({ is_featured: true })
    .eq("store_id", storeId)
    .eq("id", featuredPostId)
    .eq("status", "published");
}

export async function upsertAdminBlogSettings(
  raw: unknown,
): Promise<BlogSettingsMutationResult> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const parsed = blogSettingsFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid settings.",
    };
  }

  const values = parsed.data;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();

  if (values.featuredPostId) {
    const { data: featured } = await supabase
      .from("blog_posts")
      .select("id, status")
      .eq("store_id", storeId)
      .eq("id", values.featuredPostId)
      .maybeSingle();
    if (!featured || featured.status !== "published") {
      return {
        ok: false,
        error: "Featured article must be a published post from this store.",
      };
    }
  }

  const { data, error } = await supabase
    .from("blog_settings")
    .upsert(
      {
        store_id: storeId,
        ...blogSettingsPayload(values),
      },
      { onConflict: "store_id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    return unexpectedFailure({
      type: "CMS",
      source: "DATABASE",
      operation: "UPDATE_BLOG_SETTINGS",
      feature: "BLOG",
      message: error?.message || "Unable to save blog settings",
      error,
      storeId,
      entityType: "blog_settings",
      entityId: storeId,
      route: "/blog/settings",
    });
  }

  await syncFeaturedPostFlag(storeId, values.featuredPostId);

  await writeBlogAudit({
    storeId,
    userId: user?.id ?? null,
    action: "BLOG_SETTINGS_UPDATED",
    entityType: "blog_settings",
    entityId: storeId,
    metadata: {
      layout_preset: values.layoutPreset,
      sidebar_preset: values.sidebarPreset,
      card_style: values.cardStyle,
      featured_post_id: values.featuredPostId,
    },
  });

  revalidateTag(STOREFRONT_BLOG_CACHE_TAG, "max");

  return {
    ok: true,
    settings: mapBlogSettingsRow(data),
    message: "Blog settings saved.",
  };
}

export function toBlogSettingsFormValues(
  settings: BlogSettings,
): BlogSettingsFormValues {
  const sidebarPreset = normalizeSidebarPreset(settings.sidebarPreset);
  return {
    pageTitle: settings.pageTitle,
    pageDescription: settings.pageDescription,
    postsPerPage: settings.postsPerPage,
    showCategories: settings.showCategories,
    showAuthor: settings.showAuthor,
    showDate: settings.showDate,
    showReadingTime: settings.showReadingTime,
    showFeaturedImage: settings.showFeaturedImage,
    showShareButtons: settings.showShareButtons,
    showRelatedPosts: settings.showRelatedPosts,
    showRelatedProducts: settings.showRelatedProducts,
    showFeaturedPost: settings.showFeaturedPost,
    autoFeaturedFallback: settings.autoFeaturedFallback,
    showSidebar: settings.showSidebar,
    showSearch: settings.showSearch,
    layoutPreset:
      settings.layoutPreset === "LIST" ? "LIST" : "GRID",
    sidebarPreset,
    cardStyle: settings.cardStyle,
    featuredPostId: settings.featuredPostId,
    ctaTitle: settings.ctaTitle,
    ctaDescription: settings.ctaDescription,
    ctaButtonLabel: settings.ctaButtonLabel,
    ctaButtonHref: settings.ctaButtonHref,
  };
}

/** Published posts for the Featured article picker. */
export async function listPublishedBlogPostOptions(): Promise<
  Array<{ id: string; title: string }>
> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return [];
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("blog_posts")
    .select("id, title, published_at")
    .eq("store_id", storeId)
    .eq("status", "published")
    .or(`published_at.is.null,published_at.lte.${now}`)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(100);
  return (data ?? []).map((row) => ({ id: row.id, title: row.title }));
}
