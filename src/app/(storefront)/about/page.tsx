import { PageShell } from "@/components/layout";
import { getPlatformConfigAsync } from "@/config/site.server";
import { getPublishedStorefrontPage } from "@/features/cms/storefront";

export default async function AboutPage() {
  const [{ brand }, cmsAbout] = await Promise.all([
    getPlatformConfigAsync(),
    getPublishedStorefrontPage("about"),
  ]);

  const title = cmsAbout?.page.title || "About";
  const body =
    cmsAbout?.page.content?.trim() ||
    brand.tagline ||
    "Store story and brand content will be managed via CMS configuration.";

  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <PageShell
      title={title}
      description={brand.tagline ?? undefined}
      showBack
      backHref="/"
      backLabel="Back to home"
    >
      <div className="mx-auto max-w-2xl space-y-5">
        {paragraphs.map((paragraph) => (
          <p
            key={paragraph.slice(0, 48)}
            className="text-base leading-relaxed text-[var(--color-muted)]"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </PageShell>
  );
}
