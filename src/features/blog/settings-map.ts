import {
  normalizeCardStyle,
  normalizeSidebarPreset,
} from "@/features/blog/settings-normalize";
import { DEFAULT_BLOG_SETTINGS } from "@/features/blog/schemas";
import type { BlogSettings } from "@/features/blog/types";
import type { Tables } from "@/types/database";

type BlogSettingsRow = Tables<"blog_settings">;

/** Map a DB row (or partial row before migration) to BlogSettings. */
export function mapBlogSettingsRow(
  row: BlogSettingsRow,
  storeIdFallback?: string,
): BlogSettings {
  const layoutPreset = row.layout_preset ?? DEFAULT_BLOG_SETTINGS.layoutPreset;
  const showFeaturedPost =
    row.show_featured_post ??
    (layoutPreset === "FEATURED_GRID" ? true : DEFAULT_BLOG_SETTINGS.showFeaturedPost);

  return {
    storeId: row.store_id || storeIdFallback || "",
    pageTitle: row.page_title || DEFAULT_BLOG_SETTINGS.pageTitle,
    pageDescription: row.page_description,
    postsPerPage: row.posts_per_page ?? DEFAULT_BLOG_SETTINGS.postsPerPage,
    showCategories: row.show_categories ?? true,
    showAuthor: row.show_author ?? true,
    showDate: row.show_date ?? true,
    showReadingTime: row.show_reading_time ?? true,
    showFeaturedImage: row.show_featured_image ?? true,
    showShareButtons: row.show_share_buttons ?? true,
    showRelatedPosts: row.show_related_posts ?? true,
    showRelatedProducts: row.show_related_products ?? true,
    showFeaturedPost,
    autoFeaturedFallback: row.auto_featured_fallback ?? true,
    featuredPostId: row.featured_post_id ?? null,
    showSidebar: row.show_sidebar ?? true,
    showSearch: row.show_search ?? true,
    layoutPreset,
    sidebarPreset: normalizeSidebarPreset(row.sidebar_preset),
    cardStyle: normalizeCardStyle(row.card_style),
    ctaTitle: row.cta_title ?? null,
    ctaDescription: row.cta_description ?? null,
    ctaButtonLabel: row.cta_button_label ?? null,
    ctaButtonHref: row.cta_button_href ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function blogSettingsPayload(values: {
  pageTitle: string;
  pageDescription: string | null;
  postsPerPage: number;
  showCategories: boolean;
  showAuthor: boolean;
  showDate: boolean;
  showReadingTime: boolean;
  showFeaturedImage: boolean;
  showShareButtons: boolean;
  showRelatedPosts: boolean;
  showRelatedProducts: boolean;
  showFeaturedPost: boolean;
  autoFeaturedFallback: boolean;
  featuredPostId: string | null;
  showSidebar: boolean;
  showSearch: boolean;
  layoutPreset: BlogSettings["layoutPreset"];
  sidebarPreset: BlogSettings["sidebarPreset"];
  cardStyle: BlogSettings["cardStyle"];
  ctaTitle: string | null;
  ctaDescription: string | null;
  ctaButtonLabel: string | null;
  ctaButtonHref: string | null;
}) {
  return {
    page_title: values.pageTitle,
    page_description: values.pageDescription,
    posts_per_page: values.postsPerPage,
    show_categories: values.showCategories,
    show_author: values.showAuthor,
    show_date: values.showDate,
    show_reading_time: values.showReadingTime,
    show_featured_image: values.showFeaturedImage,
    show_share_buttons: values.showShareButtons,
    show_related_posts: values.showRelatedPosts,
    show_related_products: values.showRelatedProducts,
    show_featured_post: values.showFeaturedPost,
    auto_featured_fallback: values.autoFeaturedFallback,
    featured_post_id: values.featuredPostId,
    show_sidebar: values.showSidebar,
    show_search: values.showSearch,
    layout_preset: values.layoutPreset,
    sidebar_preset: values.sidebarPreset,
    card_style: values.cardStyle,
    cta_title: values.ctaTitle,
    cta_description: values.ctaDescription,
    cta_button_label: values.ctaButtonLabel,
    cta_button_href: values.ctaButtonHref,
  };
}
