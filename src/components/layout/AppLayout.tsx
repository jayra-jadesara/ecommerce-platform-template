import type { ReactNode } from "react";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { DeveloperCredit } from "@/components/layout/DeveloperCredit";
import { FloatingWhatsAppButton } from "@/components/layout/FloatingWhatsAppButton";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { developerCredit } from "@/data/developer-credit";
import type { CategoryMenuSource } from "@/features/catalog/category-menu";
import type { FooterFeaturedProduct, PlatformConfig } from "@/types";

type AppLayoutProps = {
  config: PlatformConfig;
  children: ReactNode;
  /** Streamed cart control (Suspense). Falls back to empty badge if omitted. */
  cartSlot?: ReactNode;
  featuredProduct?: FooterFeaturedProduct | null;
  /** Active categories for Products dropdown (empty when setting is off). */
  categoryMenu?: CategoryMenuSource[];
};

/** Storefront chrome: header, footer, and scroll affordance. */
export function AppLayout({
  config,
  children,
  cartSlot,
  featuredProduct = null,
  categoryMenu = [],
}: AppLayoutProps) {
  const showDevCredit = Boolean(developerCredit.enabled);
  const whatsappHref = config.social.whatsapp?.trim() || "";
  const showWhatsappFloat =
    Boolean(config.social.whatsappFloatEnabled) && Boolean(whatsappHref);

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
        categoryMenu={categoryMenu}
      />
      <main className="flex-1">{children}</main>
      <Footer
        brand={config.brand}
        navigation={config.navigation}
        footer={config.footer}
        contact={config.contact}
        social={config.social}
        featuredProduct={featuredProduct}
      />
      <ScrollToTop />
      {showWhatsappFloat ? (
        <FloatingWhatsAppButton href={whatsappHref} />
      ) : null}
      <DeveloperCredit />
    </div>
  );
}
