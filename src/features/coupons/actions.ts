"use server";

import { revalidatePath } from "next/cache";
import { getAdminPath } from "@/config/admin-route";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { requirePermission } from "@/features/auth/session";
import {
  createAdminCoupon,
  deleteAdminCoupon,
  updateAdminCoupon,
  type CouponMutationResult,
} from "@/features/coupons/admin-service";
import { runLoggedMutation } from "@/features/error-monitoring/unexpected";
import { publishStorefrontSync } from "@/features/sync/server";

async function revalidateCouponPaths() {
  revalidatePath(getAdminPath("/settings/coupons"));
  revalidatePath(getAdminPath("/settings"));
  const storeId = await resolveActiveStoreId();
  if (!storeId) return;
  await publishStorefrontSync({
    storeId,
    topics: ["commerce.coupons"],
  });
}

export async function createCouponAction(
  raw: unknown,
): Promise<CouponMutationResult> {
  await requirePermission("coupons.create");
  const result = await runLoggedMutation(
    {
      type: "DATABASE",
      source: "SERVER",
      operation: "CREATE_COUPON",
      feature: "COUPONS",
      entityType: "coupon",
      route: "/settings/coupons",
    },
    () => createAdminCoupon(raw),
  );
  if (result.ok) await revalidateCouponPaths();
  return result;
}

export async function updateCouponAction(
  id: string,
  raw: unknown,
): Promise<CouponMutationResult> {
  await requirePermission("coupons.update");
  const result = await runLoggedMutation(
    {
      type: "DATABASE",
      source: "SERVER",
      operation: "UPDATE_COUPON",
      feature: "COUPONS",
      entityType: "coupon",
      entityId: id,
      route: "/settings/coupons",
    },
    () => updateAdminCoupon(id, raw),
  );
  if (result.ok) await revalidateCouponPaths();
  return result;
}

export async function deleteCouponAction(
  id: string,
): Promise<CouponMutationResult> {
  await requirePermission("coupons.delete");
  const result = await runLoggedMutation(
    {
      type: "DATABASE",
      source: "SERVER",
      operation: "DELETE_COUPON",
      feature: "COUPONS",
      entityType: "coupon",
      entityId: id,
      route: "/settings/coupons",
    },
    () => deleteAdminCoupon(id),
  );
  if (result.ok) await revalidateCouponPaths();
  return result;
}
