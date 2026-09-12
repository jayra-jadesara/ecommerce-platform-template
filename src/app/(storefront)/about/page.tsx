import { PageShell } from "@/components/layout";
import { StorefrontHeading } from "@/components/ui/StorefrontHeading";
import { getPlatformConfigAsync } from "@/config/site.server";
import { HomepageSections } from "@/features/cms/components/SectionRenderer";
import { getPublishedStorefrontPage } from "@/features/cms/storefront";
import { getCurrentUser } from "@/features/auth/session";
import { sfEyebrow } from "@/components/ui/storefront-classes";

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
    <PageShell showBack backHref="/" backLabel="Back to home">
      <section className="relative isolate overflow-hidden pb-8 pt-2 text-center md:pb-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-8 -z-10 h-[18rem]"
          style={{
            background:
              "radial-gradient(ellipse 60% 75% at 50% 0%, color-mix(in srgb, var(--color-primary) 14%, transparent), transparent 60%)",
          }}
        />
        <p className={sfEyebrow()}>{brand.name}</p>
        <StorefrontHeading
          title={title}
          as="h1"
          align="center"
          className="mx-auto mt-3 max-w-3xl !text-4xl md:!text-5xl"
        />
        {subtitle ? (
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[var(--color-muted)] md:text-base">
            {subtitle}
          </p>
        ) : null}
      </section>

      {hasSections ? (
        <HomepageSections
          sections={sections}
          animation={config.animation}
          visualEffects={config.visualEffects}
          currency={config.store.currency}
          isAuthenticated={Boolean(user)}
          headingHighlightStyle={config.typography.headingHighlightStyle}
        />
      ) : (
        <p className="mx-auto max-w-lg rounded-[var(--radius-default,0.75rem)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-10 text-center text-sm leading-relaxed text-[var(--color-muted)]">
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
