import "server-only";

import { unstable_cache } from "next/cache";
import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import { formatMoney } from "@/features/catalog/money";
import { mapCouponRow } from "@/features/coupons/map";
import type { StorefrontFeaturedCoupon } from "@/features/coupons/types";
import { STOREFRONT_COUPONS_CACHE_TAG } from "@/features/sync";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export type { StorefrontFeaturedCoupon };

function getConfiguredStoreSlug(): string | null {
  const slug =
    process.env.STORE_SLUG?.trim() ||
    process.env.NEXT_PUBLIC_STORE_SLUG?.trim() ||
    "";
  return slug || null;
}

async function resolveStoreId(): Promise<string | null> {
  const supabase = createSupabasePublicClient();
  if (!supabase) return null;
  const slug = getConfiguredStoreSlug();
  let query = supabase.from("stores").select("id").eq("status", "active").limit(1);
  if (slug) {
    query = supabase
      .from("stores")
      .select("id")
      .eq("status", "active")
      .eq("slug", slug)
      .limit(1);
  }
  const { data } = await query.maybeSingle();
  return data?.id ?? null;
}

async function getStorefrontFeaturedCouponUncached(
  storeId: string,
): Promise<StorefrontFeaturedCoupon | null> {
  try {
    const supabase = createSupabaseServiceClient();

    const { data: row, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("store_id", storeId)
      .eq("show_on_storefront", true)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (error || !row) return null;

    const coupon = mapCouponRow(row);
    const now = Date.now();
    if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) {
      return null;
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now) {
      return null;
    }
    if (!coupon.promoHeadline?.trim()) return null;

    const { data: settings } = await supabase
      .from("store_settings")
      .select("currency")
      .eq("store_id", storeId)
      .maybeSingle();
    const currency = settings?.currency ?? "INR";

    const offerLabel =
      coupon.discountType === "percentage"
        ? `${coupon.discountValue}% OFF`
        : `${formatMoney(coupon.discountValue, currency)} OFF`;

    return {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      headline: coupon.promoHeadline.trim(),
      subtext: coupon.promoSubtext?.trim() || null,
      imageUrl: resolveCmsImageUrl(coupon.promoImageUrl),
      offerLabel,
      currency,
    };
  } catch {
    return null;
  }
}

/**
 * Public featured coupon for homepage modal + checkout suggestion.
 * Uses service role (coupons are not customer-readable via RLS).
 */
export async function getStorefrontFeaturedCoupon(): Promise<StorefrontFeaturedCoupon | null> {
  const storeId = await resolveStoreId();
  if (!storeId) return null;

  const cached = unstable_cache(
    () => getStorefrontFeaturedCouponUncached(storeId),
    ["storefront-featured-coupon", storeId],
    { revalidate: 60, tags: [STOREFRONT_COUPONS_CACHE_TAG] },
  );
  return cached();
}
