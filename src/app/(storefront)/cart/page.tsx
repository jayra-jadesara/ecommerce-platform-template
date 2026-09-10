import type { Metadata } from "next";
import { PageShell } from "@/components/layout";
import { CartPageClient } from "@/features/cart/components/CartPageClient";
import { getCurrentCart } from "@/features/cart/service";
import { buildPrivatePageMetadata } from "@/features/seo/private-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPrivatePageMetadata("Cart");

export default async function CartPage() {
  const cart = await getCurrentCart();

  return (
    <PageShell
      title="Your cart"
      backHref="/products"
      backLabel="Back to shopping"
    >
      <CartPageClient initialCart={cart} />
    </PageShell>
  );
}
