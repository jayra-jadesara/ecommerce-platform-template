import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout";
import { getPlatformConfigAsync } from "@/config/site";
import { getPublishedStorefrontPage } from "@/features/cms/storefront";
import { HomepageSections } from "@/features/cms/components/SectionRenderer";
import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import { HOMEPAGE_SLUG } from "@/features/cms/schemas";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug === HOMEPAGE_SLUG) return {};
  const page = await getPublishedStorefrontPage(slug);
  if (!page) return {};
  const og = resolveCmsImageUrl(page.page.ogImagePath);
  return {
    title: page.page.seoTitle || page.page.title,
    description: page.page.seoDescription || undefined,
    openGraph: og ? { images: [{ url: og }] } : undefined,
  };
}

/**
 * Published CMS pages live under /pages/[slug] so they never collide with
 * the admin catch-all /[adminSlug].
 */
export default async function CmsContentPage({ params }: Props) {
  const { slug } = await params;
  if (slug === HOMEPAGE_SLUG) notFound();

  const [config, payload] = await Promise.all([
    getPlatformConfigAsync(),
    getPublishedStorefrontPage(slug),
  ]);

  if (!payload) notFound();

  return (
    <PageShell>
      <article className="mx-auto max-w-3xl px-4 py-10">
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
        />
      ) : null}
    </PageShell>
  );
}
