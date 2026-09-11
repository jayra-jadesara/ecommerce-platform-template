import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout";
import { getPlatformConfigAsync } from "@/config/site.server";
import { getPublishedStorefrontPage } from "@/features/cms/storefront";
import { HomepageSections } from "@/features/cms/components/SectionRenderer";
import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import { HOMEPAGE_SLUG } from "@/features/cms/schemas";
import { getCurrentUser } from "@/features/auth/session";
import { metadataFromResolved } from "@/lib/metadata";
import { resolveCmsPageSeo } from "@/features/seo/resolve";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug === HOMEPAGE_SLUG) {
    return { robots: { index: false, follow: false } };
  }
  const [config, page] = await Promise.all([
    getPlatformConfigAsync(),
    getPublishedStorefrontPage(slug),
  ]);
  if (!page) {
    return { robots: { index: false, follow: false } };
  }
  const og = resolveCmsImageUrl(page.page.ogImagePath);
  const resolved = resolveCmsPageSeo({
    page: {
      title: page.page.title,
      slug: page.page.slug,
      seoTitle: page.page.seoTitle,
      seoDescription: page.page.seoDescription,
      ogImageUrl: og,
      status: page.page.status,
    },
    seo: config.seo,
  });
  return metadataFromResolved(resolved, config.seo);
}

/**
 * Published CMS pages live under /pages/[slug] so they never collide with
 * the admin catch-all /[adminSlug].
 */
export default async function CmsContentPage({ params }: Props) {
  const { slug } = await params;
  if (slug === HOMEPAGE_SLUG) notFound();

  const [config, payload, user] = await Promise.all([
    getPlatformConfigAsync(),
    getPublishedStorefrontPage(slug),
    getCurrentUser(),
  ]);

  if (!payload) notFound();

  return (
    <PageShell backHref="/" backLabel="Back to home">
      <article className="mx-auto max-w-3xl py-6 md:py-10">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
          {payload.page.title}
        </h1>
        {payload.page.content ? (
          <div className="mt-6 whitespace-pre-wrap text-[var(--color-muted)]">
            {payload.page.content}
          </div>
        ) : null}
      </article>
      {payload.sections.length > 0 ? (
        <HomepageSections
          sections={payload.sections}
          animation={config.animation}
          visualEffects={config.visualEffects}
          currency={config.store.currency}
          isAuthenticated={Boolean(user)}
        />
      ) : null}
    </PageShell>
  );
}
