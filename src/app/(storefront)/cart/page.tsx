import type { Metadata } from "next";
import { PageShell, StorefrontBreadcrumb } from "@/components/layout";
import { StorefrontHeading } from "@/components/ui/StorefrontHeading";
import { CartPageClient } from "@/features/cart/components/CartPageClient";
import { getCurrentCart } from "@/features/cart/service";
import { buildPrivatePageMetadata } from "@/features/seo/private-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPrivatePageMetadata("Cart");

export default async function CartPage() {
  const cart = await getCurrentCart();

  return (
    <PageShell showBack={false} className="!pt-3 md:!pt-5">
      <StorefrontBreadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Products", href: "/products" },
          { label: "Cart" },
        ]}
      />
      <header className="mb-5 md:mb-6">
        <StorefrontHeading
          title="Your cart"
          as="h1"
          align="left"
          className="!text-2xl md:!text-3xl"
        />
      </header>
      <CartPageClient initialCart={cart} />
    </PageShell>
  );
}
