import type { ReactNode } from "react";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import type { PlatformConfig } from "@/types";

interface AppLayoutProps {
  config: PlatformConfig;
  children: ReactNode;
}

export function AppLayout({ config, children }: AppLayoutProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--color-background)] text-[var(--color-foreground)]">
      <AnnouncementBar announcement={config.header.announcement} />
      <Header
        brand={config.brand}
        navigation={config.navigation}
        layout={config.layout}
        header={config.header}
      />
      {children}
      <Footer
        brand={config.brand}
        navigation={config.navigation}
        footer={config.footer}
        contact={config.contact}
        social={config.social}
      />
    </div>
  );
}
