import type { ReactNode } from "react";
import { Suspense } from "react";
import { AppLayout } from "@/components/layout";
import { getPlatformConfigAsync } from "@/config/site.server";
import { HeaderCartBadge } from "@/features/cart/components/HeaderCartBadge";
import { HeaderCartControlFallback } from "@/features/cart/components/HeaderCartControl";

export default async function StorefrontLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Config only on the critical path — cart count streams via Suspense.
  const config = await getPlatformConfigAsync();
  return (
    <AppLayout
      config={config}
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
