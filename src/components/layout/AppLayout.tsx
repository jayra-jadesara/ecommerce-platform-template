import type { ReactNode } from "react";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { DeveloperCredit } from "@/components/layout/DeveloperCredit";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import creditJson from "@/data/developer-credit.json";
import type { FooterFeaturedProduct, PlatformConfig } from "@/types";

interface AppLayoutProps {
  config: PlatformConfig;
  children: ReactNode;
  /** Streamed cart control (Suspense). Falls back to empty badge if omitted. */
  cartSlot?: ReactNode;
  featuredProduct?: FooterFeaturedProduct | null;
}

/** Storefront chrome: header, footer, and scroll affordance. */
export function AppLayout({
  config,
  children,
  cartSlot,
  featuredProduct = null,
}: AppLayoutProps) {
  const showDevCredit = Boolean(
    (creditJson as { enabled?: boolean }).enabled,
  );

  return (
    <div
      className="flex min-h-dvh flex-1 flex-col bg-[var(--color-background)] text-[var(--color-foreground)]"
      data-dev-credit={showDevCredit ? "on" : undefined}
    >
      <AnnouncementBar announcement={config.header.announcement} />
      <Header
        brand={config.brand}
        navigation={config.navigation}
        layout={config.layout}
        header={config.header}
        cartSlot={cartSlot}
      />
      {children}
      <Footer
        brand={config.brand}
        navigation={config.navigation}
        footer={config.footer}
        contact={config.contact}
        social={config.social}
        featuredProduct={featuredProduct}
      />
      <DeveloperCredit />
      <ScrollToTop />
    </div>
  );
}
