import "server-only";

import { writeCouponAudit } from "@/features/coupons/audit";
import { mapCouponRow } from "@/features/coupons/map";
import { normalizeCouponCode } from "@/features/coupons/normalize";
import {
  couponFormSchema,
  couponListQuerySchema,
  type CouponFormValues,
  type CouponListQuery,
} from "@/features/coupons/schemas";
import { deriveCouponDisplayStatus } from "@/features/coupons/status";
import type {
  CouponDisplayStatus,
  CouponRow,
} from "@/features/coupons/types";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/features/auth/session";

export type AdminCouponListItem = CouponRow & {
  status: CouponDisplayStatus;
  redemptionCount: number;
};

export type AdminCouponListResult = {
  items: AdminCouponListItem[];
  total: number;
  query: CouponListQuery;
  currency: string;
  storeId: string;
};

async function requireStoreContext(): Promise<{
  storeId: string;
  currency: string;
} | null> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("store_settings")
    .select("currency")
    .eq("store_id", storeId)
    .maybeSingle();
  return { storeId, currency: data?.currency ?? "INR" };
}

export async function listAdminCoupons(
  rawQuery: Record<string, string | undefined> = {},
): Promise<AdminCouponListResult | null> {
  const ctx = await requireStoreContext();
  if (!ctx) return null;

  const query = couponListQuerySchema.parse({
    q: rawQuery.q,
    status: rawQuery.status,
    sort: rawQuery.sort,
    page: rawQuery.page,
    pageSize: rawQuery.pageSize,
  });

  const supabase = await createSupabaseServerClient();
  let builder = supabase
    .from("coupons")
    .select("*", { count: "exact" })
    .eq("store_id", ctx.storeId);

  if (query.q.trim()) {
    const term = `%${query.q.trim().replace(/[%_,]/g, "")}%`;
    builder = builder.or(`code.ilike.${term},description.ilike.${term}`);
  }

  switch (query.sort) {
    case "oldest":
      builder = builder.order("created_at", { ascending: true });
      break;
    case "code":
      builder = builder.order("code", { ascending: true });
      break;
    case "code_desc":
      builder = builder.order("code", { ascending: false });
      break;
    case "expiry":
      builder = builder.order("expires_at", { ascending: true, nullsFirst: false });
      break;
    default:
      builder = builder.order("created_at", { ascending: false });
  }

  // Fetch a wider window when filtering by derived status, then paginate in memory.
  const needsDerivedFilter = query.status !== "all";
  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;

  if (!needsDerivedFilter) {
    builder = builder.range(from, to);
  }

  const { data, count, error } = await builder;
  if (error) {
    return {
      items: [],
      total: 0,
      query,
      currency: ctx.currency,
      storeId: ctx.storeId,
    };
  }

  const couponIds = (data ?? []).map((r) => r.id);
  const redemptionCounts = new Map<string, number>();
  if (couponIds.length > 0) {
    const { data: redemptions } = await supabase
      .from("coupon_redemptions")
      .select("coupon_id")
      .in("coupon_id", couponIds);
    for (const row of redemptions ?? []) {
      redemptionCounts.set(
        row.coupon_id,
        (redemptionCounts.get(row.coupon_id) ?? 0) + 1,
      );
    }
  }

  let items: AdminCouponListItem[] = (data ?? []).map((row) => {
    const coupon = mapCouponRow(row);
    const redemptionCount = redemptionCounts.get(row.id) ?? 0;
    return {
      ...coupon,
      redemptionCount,
      status: deriveCouponDisplayStatus({ ...coupon, redemptionCount }),
    };
  });

  if (needsDerivedFilter) {
    const statusMap: Record<string, CouponDisplayStatus> = {
      active: "ACTIVE",
      inactive: "INACTIVE",
      scheduled: "SCHEDULED",
      expired: "EXPIRED",
      exhausted: "EXHAUSTED",
    };
    const wanted = statusMap[query.status];
    items = items.filter((item) => item.status === wanted);
    const total = items.length;
    items = items.slice(from, from + query.pageSize);
    return {
      items,
      total,
      query,
      currency: ctx.currency,
      storeId: ctx.storeId,
    };
  }

  return {
    items,
    total: count ?? items.length,
    query,
    currency: ctx.currency,
    storeId: ctx.storeId,
  };
}

export async function getAdminCoupon(
  id: string,
): Promise<(AdminCouponListItem & { currency: string }) | null> {
  const ctx = await requireStoreContext();
  if (!ctx) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("coupons")
    .select("*")
    .eq("id", id)
    .eq("store_id", ctx.storeId)
    .maybeSingle();
  if (!data) return null;

  const { count } = await supabase
    .from("coupon_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("coupon_id", id);

  const coupon = mapCouponRow(data);
  const redemptionCount = count ?? 0;
  return {
    ...coupon,
    redemptionCount,
    status: deriveCouponDisplayStatus({ ...coupon, redemptionCount }),
    currency: ctx.currency,
  };
}

export type CouponMutationResult =
  | { ok: true; id: string; message?: string }
  | { ok: false; error: string };

export async function createAdminCoupon(
  raw: unknown,
): Promise<CouponMutationResult> {
  const ctx = await requireStoreContext();
  if (!ctx) return { ok: false, error: "Store not found." };

  const parsed = couponFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid coupon.",
    };
  }
  const values = parsed.data;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();

  const { data: existing } = await supabase
    .from("coupons")
    .select("id")
    .eq("store_id", ctx.storeId)
    .ilike("code", values.code)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      error: "A coupon with this code already exists for this store.",
    };
  }

  const { data, error } = await supabase
    .from("coupons")
    .insert({
      store_id: ctx.storeId,
      code: values.code,
      description: values.description,
      discount_type: values.discountType,
      discount_value: values.discountValue,
      minimum_order_amount: values.minimumOrderAmount,
      maximum_discount_amount: values.maximumDiscountAmount,
      usage_limit: values.usageLimit,
      per_user_limit: values.perUserLimit,
      starts_at: values.startsAt,
      expires_at: values.expiresAt,
      is_active: values.isActive,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return {
        ok: false,
        error: "A coupon with this code already exists for this store.",
      };
    }
    return { ok: false, error: "Unable to create coupon." };
  }

  await writeCouponAudit({
    storeId: ctx.storeId,
    userId: user?.id ?? null,
    action: "COUPON_CREATED",
    entityId: data.id,
    metadata: { code: values.code },
  });

  return { ok: true, id: data.id, message: "Coupon created." };
}

export async function updateAdminCoupon(
  id: string,
  raw: unknown,
): Promise<CouponMutationResult> {
  const ctx = await requireStoreContext();
  if (!ctx) return { ok: false, error: "Store not found." };

  const parsed = couponFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid coupon.",
    };
  }
  const values = parsed.data;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();

  const { data: current } = await supabase
    .from("coupons")
    .select("id, code, is_active")
    .eq("id", id)
    .eq("store_id", ctx.storeId)
    .maybeSingle();

  if (!current) return { ok: false, error: "Coupon not found." };

  if (normalizeCouponCode(current.code) !== values.code) {
    const { data: clash } = await supabase
      .from("coupons")
      .select("id")
      .eq("store_id", ctx.storeId)
      .ilike("code", values.code)
      .neq("id", id)
      .limit(1)
      .maybeSingle();
    if (clash) {
      return {
        ok: false,
        error: "A coupon with this code already exists for this store.",
      };
    }
  }

  const { error } = await supabase
    .from("coupons")
    .update({
      code: values.code,
      description: values.description,
      discount_type: values.discountType,
      discount_value: values.discountValue,
      minimum_order_amount: values.minimumOrderAmount,
      maximum_discount_amount: values.maximumDiscountAmount,
      usage_limit: values.usageLimit,
      per_user_limit: values.perUserLimit,
      starts_at: values.startsAt,
      expires_at: values.expiresAt,
      is_active: values.isActive,
    })
    .eq("id", id)
    .eq("store_id", ctx.storeId);

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "A coupon with this code already exists for this store.",
      };
    }
    return { ok: false, error: "Unable to update coupon." };
  }

  const wasDisabled = current.is_active && !values.isActive;
  await writeCouponAudit({
    storeId: ctx.storeId,
    userId: user?.id ?? null,
    action: wasDisabled ? "COUPON_DISABLED" : "COUPON_UPDATED",
    entityId: id,
    metadata: { code: values.code },
  });

  return { ok: true, id, message: "Coupon updated." };
}

/**
 * Prefer deactivate when the coupon has redemptions; hard-delete only when unused.
 */
export async function deleteAdminCoupon(
  id: string,
): Promise<CouponMutationResult> {
  const ctx = await requireStoreContext();
  if (!ctx) return { ok: false, error: "Store not found." };

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();

  const { data: current } = await supabase
    .from("coupons")
    .select("id, code, is_active")
    .eq("id", id)
    .eq("store_id", ctx.storeId)
    .maybeSingle();

  if (!current) return { ok: false, error: "Coupon not found." };

  const { count } = await supabase
    .from("coupon_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("coupon_id", id);

  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from("coupons")
      .update({ is_active: false })
      .eq("id", id)
      .eq("store_id", ctx.storeId);
    if (error) return { ok: false, error: "Unable to deactivate coupon." };

    await writeCouponAudit({
      storeId: ctx.storeId,
      userId: user?.id ?? null,
      action: "COUPON_DISABLED",
      entityId: id,
      metadata: {
        code: current.code,
        reason: "Has redemption history — deactivated instead of deleted.",
      },
    });

    return {
      ok: true,
      id,
      message: "Coupon has usage history, so it was deactivated instead of deleted.",
    };
  }

  const { error } = await supabase
    .from("coupons")
    .delete()
    .eq("id", id)
    .eq("store_id", ctx.storeId);

  if (error) return { ok: false, error: "Unable to delete coupon." };

  await writeCouponAudit({
    storeId: ctx.storeId,
    userId: user?.id ?? null,
    action: "COUPON_DELETED",
    entityId: id,
    metadata: { code: current.code },
  });

  return { ok: true, id, message: "Coupon deleted." };
}

export function toCouponFormValues(coupon: CouponRow): CouponFormValues {
  return {
    code: coupon.code,
    description: coupon.description,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minimumOrderAmount: coupon.minimumOrderAmount,
    maximumDiscountAmount: coupon.maximumDiscountAmount,
    usageLimit: coupon.usageLimit,
    perUserLimit: coupon.perUserLimit,
    startsAt: coupon.startsAt,
    expiresAt: coupon.expiresAt,
    isActive: coupon.isActive,
  };
}
