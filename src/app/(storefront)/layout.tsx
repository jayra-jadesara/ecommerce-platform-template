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
import { getFooterFeaturedProduct } from "@/features/theme/footer-featured-product";

export default async function StorefrontLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Load config first so the shell can paint; do not batch it with other awaits.
  const config = await getPlatformConfigAsync();
  const [featuredProduct, publishedLegal] = await Promise.all([
    getFooterFeaturedProduct(),
    getPublishedLegalLinkMap(),
  ]);

  const navigation = {
    ...config.navigation,
    primary: applyLegalLinksToNav(config.navigation.primary, publishedLegal),
    footer: applyLegalLinksToNav(config.navigation.footer, publishedLegal),
  };

  return (
    <AppLayout
      config={{ ...config, navigation }}
      featuredProduct={featuredProduct}
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
