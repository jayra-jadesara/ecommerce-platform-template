import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { getCurrentUser } from "@/features/auth/session";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { buildPrivatePageMetadata } from "@/features/seo/private-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPrivatePageMetadata("Payment failed");

export default async function PaymentFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/payment/failed");
  }

  const params = await searchParams;
  const paymentId = params.paymentId?.trim();
  let reason =
    "Payment could not be completed. You have not been charged for a failed attempt.";

  if (paymentId) {
    const supabase = createSupabaseServiceClient();
    const { data: payment } = await supabase
      .from("payments")
      .select("id, status, user_id, failure_reason")
      .eq("id", paymentId)
      .maybeSingle();

    if (payment && payment.user_id === user.id) {
      if (payment.status === "CAPTURED" || payment.status === "AUTHORIZED") {
        redirect(
          `/payment/success?paymentId=${encodeURIComponent(paymentId)}`,
        );
      }
      if (payment.failure_reason) {
        reason =
          "Payment failed. Please try again from checkout with a different method if needed.";
      }
    }
  }

  return (
    <PageShell title="Payment failed">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <p className="text-sm text-[var(--color-muted)]">{reason}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/checkout"
            className="inline-flex rounded-md bg-[var(--color-button-background)] px-4 py-2 text-sm font-medium text-[var(--color-button-foreground)]"
          >
            Try again
          </Link>
          <Link
            href="/cart"
            className="inline-flex rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-medium"
          >
            Back to cart
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
