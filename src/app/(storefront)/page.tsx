import type { Metadata } from "next";
import { Container } from "@/components/layout";
import { getSiteUrl } from "@/config/site";
import { getPlatformConfigAsync } from "@/config/site.server";
import { HomepageSections } from "@/features/cms/components/SectionRenderer";
import { getPublishedHomepage } from "@/features/cms/storefront";
import {
  listStorefrontCategories,
  listStorefrontProducts,
} from "@/features/catalog/storefront";
import { getCurrentUser } from "@/features/auth/session";
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
  const [config, homepage, categories, productList, user] = await Promise.all([
    getPlatformConfigAsync(),
    getPublishedHomepage(),
    listStorefrontCategories(),
    listStorefrontProducts({
      page: "1",
      pageSize: "8",
      sort: "featured",
    }),
    getCurrentUser(),
  ]);

  const isAuthenticated = Boolean(user);
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
    <Container as="main" flush constrained={false} className="relative z-0 flex-1">
      <JsonLdScript data={[org, website]} />
      {hasSections && homepage ? (
        <HomepageSections
          sections={homepage.sections}
          animation={config.animation}
          visualEffects={config.visualEffects}
          currency={config.store.currency}
          isAuthenticated={isAuthenticated}
          headingHighlightStyle={config.typography.headingHighlightStyle}
        />
      ) : (
        <HomeView
          config={config}
          products={productList.items}
          categories={categories}
          currency={config.store.currency}
          isAuthenticated={isAuthenticated}
        />
      )}
    </Container>
  );
}
