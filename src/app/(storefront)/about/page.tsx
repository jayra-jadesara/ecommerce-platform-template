import { PageShell, StorefrontBreadcrumb } from "@/components/layout";
import { StorefrontHeading } from "@/components/ui/StorefrontHeading";
import { sfEyebrow } from "@/components/ui/storefront-classes";
import { getPlatformConfigAsync } from "@/config/site.server";
import { HomepageSections } from "@/features/cms/components/SectionRenderer";
import { getPublishedStorefrontPage } from "@/features/cms/storefront";
import { getCurrentUser } from "@/features/auth/session";

export const dynamic = "force-dynamic";

/**
 * Storefront About page.
 * Layout content (founder story, quote, portrait, timeline) comes from
 * Admin → Content → About sections. Page title/SEO from the published About page.
 */
export default async function AboutPage() {
  const [config, cmsAbout, user] = await Promise.all([
    getPlatformConfigAsync(),
    getPublishedStorefrontPage("about"),
    getCurrentUser(),
  ]);

  const { brand } = config;
  const title = cmsAbout?.page.title?.trim() || `About ${brand.name}`;
  const subtitle =
    cmsAbout?.page.seoDescription?.trim() || brand.tagline?.trim() || null;
  const sections = cmsAbout?.sections ?? [];
  const hasSections = sections.length > 0;

  return (
    <PageShell showBack={false} className="!pt-3 md:!pt-5">
      <StorefrontBreadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "About" },
        ]}
      />
      <header className="sf-page-hero sf-page-hero--center">
        <p className={sfEyebrow()}>{brand.name}</p>
        <StorefrontHeading
          title={title}
          as="h1"
          align="center"
          className="w-full max-w-3xl"
        />
        {subtitle ? (
          <p className="sf-page-hero__support">{subtitle}</p>
        ) : null}
      </header>

      {hasSections ? (
        <div className="sf-about-page-body">
          <HomepageSections
            sections={sections}
            animation={config.animation}
            visualEffects={config.visualEffects}
            currency={config.store.currency}
            storeName={config.brand.name}
            isAuthenticated={Boolean(user)}
            headingHighlightStyle={config.typography.headingHighlightStyle}
          />
        </div>
      ) : (
        <p className="mx-auto mt-8 max-w-lg rounded-[var(--radius-default,0.75rem)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-10 text-center text-sm leading-relaxed text-[var(--color-muted)]">
          About sections are not visible yet. In admin go to{" "}
          <strong className="text-[var(--color-foreground)]">
            Content → About
          </strong>
          , open the About section → <strong>Edit</strong> → fill heading /
          story / quote / portrait → <strong>Save section</strong>, then keep
          the page <strong>Published</strong>.
        </p>
      )}
    </PageShell>
  );
}
