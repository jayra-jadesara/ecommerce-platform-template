import type { Metadata } from "next";
import { PageShell } from "@/components/layout";
import { getPlatformConfigAsync, getSiteUrl } from "@/config/site";
import { HomepageSections } from "@/features/cms/components/SectionRenderer";
import { getPublishedHomepage } from "@/features/cms/storefront";
import { metadataFromResolved } from "@/lib/metadata";
import { resolveStoreHomepageSeo } from "@/features/seo/resolve";
import {
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
  JsonLdScript,
} from "@/features/seo";
import { HomeView } from "./home-view";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getPlatformConfigAsync();
  const resolved = resolveStoreHomepageSeo({
    seo: config.seo,
    brandName: config.brand.name,
  });
  return metadataFromResolved(resolved, {
    ...config.seo,
    ogImage: config.seo.ogImage ?? config.brand.socialImageUrl,
  });
}

export default async function HomePage() {
  const [config, homepage] = await Promise.all([
    getPlatformConfigAsync(),
    getPublishedHomepage(),
  ]);

  const hasSections = (homepage?.sections.length ?? 0) > 0;
  const siteUrl = getSiteUrl();
  const org = buildOrganizationJsonLd({
    name: config.brand.name,
    url: siteUrl,
    logoUrl: config.brand.logoUrl,
    email: config.contact.email,
    phone: config.contact.phone,
  });
  const website = buildWebSiteJsonLd({
    name: config.seo.siteName || config.brand.name,
    url: siteUrl,
    includeSearchAction: true,
  });

  return (
    <PageShell>
      <JsonLdScript data={[org, website]} />
      {hasSections && homepage ? (
        <HomepageSections
          sections={homepage.sections}
          animation={config.animation}
          visualEffects={config.visualEffects}
        />
      ) : (
        <HomeView config={config} />
      )}
    </PageShell>
  );
}
