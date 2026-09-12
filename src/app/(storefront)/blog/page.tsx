import type { Metadata } from "next";
import { Container } from "@/components/layout";
import { StorefrontHeading } from "@/components/ui/StorefrontHeading";
import { getPlatformConfigAsync } from "@/config/site.server";
import { BlogBreadcrumb } from "@/features/blog/components/BlogBreadcrumb";
import { BlogListing } from "@/features/blog/components/BlogListing";
import { DEFAULT_BLOG_SETTINGS } from "@/features/blog/schemas";
import { wantsFeaturedBlock } from "@/features/blog/settings-normalize";
import {
  getBlogSettingsCached,
  getFeaturedBlogPost,
  listActiveBlogCategoriesWithCounts,
  listPublishedBlogPosts,
} from "@/features/blog/storefront";
import type { BlogSettings } from "@/features/blog/types";
import { resolveBlogListingSeo } from "@/features/seo/resolve";
import { metadataFromResolved } from "@/lib/metadata";

export const dynamic = "force-dynamic";

function fallbackSettings(storeId = ""): BlogSettings {
  return {
    storeId,
    ...DEFAULT_BLOG_SETTINGS,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

function paramString(
  value: string | string[] | undefined,
): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return "";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const page = Number(paramString(params.page) || "1") || 1;
  const categorySlug = paramString(params.category).trim() || undefined;
  const q = paramString(params.q).trim() || undefined;

  const [config, settings] = await Promise.all([
    getPlatformConfigAsync(),
    getBlogSettingsCached(),
  ]);

  const resolved = resolveBlogListingSeo({
    settings: settings ?? fallbackSettings(),
    seo: config.seo,
    page,
    categorySlug,
    q,
  });
  return metadataFromResolved(resolved, config.seo);
}

export default async function BlogListingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(paramString(params.page) || "1") || 1);
  const categorySlug = paramString(params.category).trim() || undefined;
  const q = paramString(params.q).trim() || undefined;

  const settings = (await getBlogSettingsCached()) ?? fallbackSettings();
  const pageSize = settings.postsPerPage;
  const loadFeatured =
    wantsFeaturedBlock(settings) && page <= 1 && !categorySlug && !q;

  const [postsResult, categories, featured] = await Promise.all([
    listPublishedBlogPosts({
      page,
      pageSize,
      categorySlug,
      q,
    }),
    settings.showCategories
      ? listActiveBlogCategoriesWithCounts()
      : Promise.resolve([]),
    loadFeatured ? getFeaturedBlogPost(settings) : Promise.resolve(null),
  ]);

  const categoryLabel = categorySlug
    ? categories.find((c) => c.slug === categorySlug)?.name ?? categorySlug
    : undefined;

  return (
    <Container
      as="main"
      className="relative z-0 flex-1 pb-10 pt-6 md:pb-14 md:pt-8"
    >
      <BlogBreadcrumb categoryLabel={categoryLabel} />
      <header className="mb-6 max-w-2xl md:mb-8">
        <StorefrontHeading
          title={settings.pageTitle || "Blog"}
          as="h1"
          align="left"
          className="!text-3xl md:!text-[2.35rem] md:!leading-tight"
        />
        {settings.pageDescription?.trim() ? (
          <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-[var(--color-muted)] md:text-[0.95rem]">
            {settings.pageDescription.trim()}
          </p>
        ) : null}
      </header>

      <BlogListing
        settings={settings}
        posts={postsResult.items}
        total={postsResult.total}
        page={postsResult.page}
        pageSize={postsResult.pageSize}
        categories={categories}
        featured={featured}
        categorySlug={categorySlug}
        q={q}
      />
    </Container>
  );
}
