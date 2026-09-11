/** Shared / client-safe blog exports. Import services & actions from their modules. */

export {
  STOREFRONT_BLOG_CACHE_TAG,
  blogPostCacheTag,
  blogCategoryCacheTag,
} from "@/features/blog/cache";

export {
  blogCategoryFormSchema,
  blogPostFormSchema,
  blogSettingsFormSchema,
  blogListQuerySchema,
  blogPostListQuerySchema,
  blogPostStatusSchema,
  DEFAULT_BLOG_POST_FORM,
  DEFAULT_BLOG_CATEGORY_FORM,
  DEFAULT_BLOG_SETTINGS,
  DEFAULT_BLOG_SETTINGS_FORM,
  BLOG_POST_STATUSES,
  BLOG_LAYOUT_PRESETS,
  BLOG_SIDEBAR_PRESETS,
  BLOG_CARD_STYLES,
  type BlogCategoryFormValues,
  type BlogPostFormValues,
  type BlogSettingsFormValues,
  type BlogListQuery,
  type BlogPostListQuery,
  type BlogLayoutPreset,
  type BlogSidebarPreset,
  type BlogCardStyle,
} from "@/features/blog/schemas";

export type {
  BlogPost,
  BlogCategory,
  BlogSettings,
  AdminBlogPostListItem,
  BlogProductOption,
  StorefrontBlogCategory,
  StorefrontBlogPostSummary,
  StorefrontBlogPost,
  BlogPostStatus,
} from "@/features/blog/types";

export {
  normalizeSidebarPreset,
  normalizeCardStyle,
  isListLayout,
  wantsFeaturedBlock,
  listingLayoutPreset,
} from "@/features/blog/settings-normalize";

export {
  stripUnsafeContent,
  estimateReadingMinutes,
  isPubliclyVisiblePost,
} from "@/features/blog/sanitize";

export { MarkdownContent } from "@/features/blog/markdown";
