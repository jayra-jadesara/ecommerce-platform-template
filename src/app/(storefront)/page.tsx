import type { Metadata } from "next";
import { Container } from "@/components/layout";
import { getPlatformConfigAsync } from "@/config/site.server";
import { HomepageSections } from "@/features/cms/components/SectionRenderer";
import {
  listStorefrontCategories,
  listStorefrontProducts,
} from "@/features/catalog/storefront";
import { getCurrentUser } from "@/features/auth/session";
import { metadataFromResolved } from "@/lib/metadata";
import { resolveSiteOrigin } from "@/lib/site-url";
import { resolveStoreHomepageSeo } from "@/features/seo/resolve";
import {
  buildLocalBusinessJsonLd,
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
  JsonLdScript,
} from "@/features/seo";
import { HomeView } from "./home-view";
import { getStorefrontFeaturedCoupon } from "@/features/coupons/storefront";
import { CouponPromoModal } from "@/features/coupons/components/CouponPromoModal";
import {
  getActiveStorefrontBanners,
  getPublishedHomepage,
} from "@/features/cms/storefront";
import { StorefrontPromoBanners } from "@/features/cms/components/StorefrontPromoBanners";

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
  const [config, homepage, categories, productList, user, featuredCoupon, banners] =
    await Promise.all([
      getPlatformConfigAsync(),
      getPublishedHomepage(),
      listStorefrontCategories(),
      listStorefrontProducts({
        page: "1",
        pageSize: "8",
        sort: "featured",
      }),
      getCurrentUser(),
      getStorefrontFeaturedCoupon(),
      getActiveStorefrontBanners(),
    ]);

  const isAuthenticated = Boolean(user);
  const hasSections = (homepage?.sections.length ?? 0) > 0;
  const siteUrl = resolveSiteOrigin(config.seo.canonicalUrl);
  const schema = config.seo.schema;
  const sameAs = [
    config.social.instagram,
    config.social.facebook,
    config.social.youtube,
    config.social.linkedin,
    config.social.x,
  ].filter((u): u is string => Boolean(u?.trim()));
  const street = [config.contact.addressLine1, config.contact.addressLine2]
    .filter(Boolean)
    .join(", ");
  const local =
    schema?.localBusiness !== false
      ? buildLocalBusinessJsonLd({
          name: config.store.legalName?.trim() || config.brand.name,
          url: siteUrl,
          logoUrl: config.brand.logoUrl,
          email: config.contact.email ?? config.store.supportEmail,
          phone: config.contact.phone ?? config.store.supportPhone,
          address: {
            streetAddress: street || null,
            addressLocality: config.contact.city,
            addressRegion: config.contact.state,
            postalCode: config.contact.postalCode,
            addressCountry: config.contact.country,
          },
          businessType: schema?.businessType,
          priceRange: schema?.priceRange,
          geoLat: schema?.geoLat,
          geoLng: schema?.geoLng,
          sameAs,
        })
      : null;
  const org =
    !local && schema?.organization !== false
      ? buildOrganizationJsonLd({
          name: config.brand.name,
          url: siteUrl,
          logoUrl: config.brand.logoUrl,
          email: config.contact.email,
          phone: config.contact.phone,
          sameAs,
        })
      : null;
  const website = buildWebSiteJsonLd({
    name: config.seo.siteName || config.brand.name,
    url: siteUrl,
    includeSearchAction: schema?.websiteSearch !== false,
  });
  const jsonLd = [local, org, website].filter(
    (item): item is NonNullable<typeof item> => Boolean(item),
  );

  return (
    <Container as="main" flush constrained={false} className="relative z-0 flex-1">
      {jsonLd.length ? <JsonLdScript data={jsonLd} /> : null}
      <StorefrontPromoBanners banners={banners} />
      {hasSections && homepage ? (
        <HomepageSections
          sections={homepage.sections}
          animation={config.animation}
          visualEffects={config.visualEffects}
          currency={config.store.currency}
          storeName={config.brand.name}
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
      {featuredCoupon ? <CouponPromoModal promo={featuredCoupon} /> : null}
    </Container>
  );
}
