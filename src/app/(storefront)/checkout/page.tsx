import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout";
import { CheckoutClient } from "@/features/checkout/components/CheckoutClient";
import { getCheckoutSummary } from "@/features/checkout/service";
import { getCurrentUser } from "@/features/auth/session";
import { buildPrivatePageMetadata } from "@/features/seo/private-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPrivatePageMetadata("Buy it now");

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/checkout");
  }

  const summary = await getCheckoutSummary();

  return (
    <PageShell title="Buy it now" backHref="/cart" backLabel="Back to cart">
      <CheckoutClient initialSummary={summary} />
    </PageShell>
  );
}
