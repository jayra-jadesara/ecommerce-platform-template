import type { ReactNode } from "react";
import { Suspense } from "react";
import { AppLayout } from "@/components/layout";
import { getPlatformConfigAsync } from "@/config/site.server";
import { HeaderCartBadge } from "@/features/cart/components/HeaderCartBadge";
import { HeaderCartControlFallback } from "@/features/cart/components/HeaderCartControl";
import {
  applyLegalLinksToNav,
  getPublishedLegalLinkMap,
} from "@/features/cms/storefront";
import { listStorefrontCategories } from "@/features/catalog/storefront";
import { getFooterFeaturedProduct } from "@/features/theme/footer-featured-product";

export default async function StorefrontLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Load config first so the shell can paint; do not batch it with other awaits.
  const config = await getPlatformConfigAsync();
  const [featuredProduct, publishedLegal, categories] = await Promise.all([
    getFooterFeaturedProduct(),
    getPublishedLegalLinkMap(),
    config.header.productsCategoryMenu
      ? listStorefrontCategories()
      : Promise.resolve([]),
  ]);

  const navigation = {
    ...config.navigation,
    primary: applyLegalLinksToNav(config.navigation.primary, publishedLegal),
    footer: applyLegalLinksToNav(config.navigation.footer, publishedLegal),
  };

  const categoryMenu = config.header.productsCategoryMenu
    ? categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        parent_id: c.parent_id,
        imageUrl: c.imageUrl ?? null,
      }))
    : [];

  return (
    <AppLayout
      config={{ ...config, navigation }}
      featuredProduct={featuredProduct}
      categoryMenu={categoryMenu}
      cartSlot={
        <Suspense fallback={<HeaderCartControlFallback />}>
          <HeaderCartBadge />
        </Suspense>
      }
    >
      {children}
    </AppLayout>
  );
}
