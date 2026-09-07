import { PageShell } from "@/components/layout";
import { CartPageClient } from "@/features/cart/components/CartPageClient";
import { getCurrentCart } from "@/features/cart/service";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const cart = await getCurrentCart();

  return (
    <PageShell
      title="Your cart"
      description="Review items before checkout. Prices shown are current catalog prices and may change before payment."
    >
      <CartPageClient initialCart={cart} />
    </PageShell>
  );
}
