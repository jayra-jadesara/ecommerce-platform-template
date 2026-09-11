import type {
  BlogCardStyle,
  BlogLayoutPreset,
  BlogPostStatus,
  BlogSidebarPreset,
} from "@/types/database";

export type {
  BlogCardStyle,
  BlogLayoutPreset,
  BlogPostStatus,
  BlogSidebarPreset,
};

export type BlogCategory = {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  description: string | null;
  imagePath: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type BlogPost = {
  id: string;
  storeId: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  featuredImagePath: string | null;
  authorName: string | null;
  status: BlogPostStatus;
  isFeatured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImagePath: string | null;
  publishedAt: string | null;
  readingTimeMinutes: number | null;
  createdAt: string;
  updatedAt: string;
  categoryIds: string[];
  productIds: string[];
};

export type BlogSettings = {
  storeId: string;
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
  layoutPreset: BlogLayoutPreset;
  sidebarPreset: BlogSidebarPreset;
  cardStyle: BlogCardStyle;
  ctaTitle: string | null;
  ctaDescription: string | null;
  ctaButtonLabel: string | null;
  ctaButtonHref: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminBlogPostListItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: BlogPostStatus;
  isFeatured: boolean;
  authorName: string | null;
  publishedAt: string | null;
  updatedAt: string;
  categoryNames: string[];
  primaryCategoryName: string | null;
  featuredImagePath?: string | null;
  featuredImageUrl?: string | null;
};

export type BlogProductOption = {
  id: string;
  name: string;
};

export type StorefrontBlogCategory = BlogCategory & {
  postCount: number;
  imageUrl?: string | null;
};

export type StorefrontBlogPostSummary = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  authorName: string | null;
  publishedAt: string | null;
  readingTimeMinutes: number | null;
  isFeatured: boolean;
  featuredImagePath: string | null;
  featuredImageUrl?: string | null;
  categories: Array<{ id: string; name: string; slug: string }>;
};

export type StorefrontBlogPost = StorefrontBlogPostSummary & {
  content: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImagePath: string | null;
  productIds: string[];
};
