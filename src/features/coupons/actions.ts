"use server";

import { revalidatePath } from "next/cache";
import { getAdminPath } from "@/config/admin-route";
import { requirePermission } from "@/features/auth/session";
import {
  createAdminCoupon,
  deleteAdminCoupon,
  updateAdminCoupon,
  type CouponMutationResult,
} from "@/features/coupons/admin-service";

function revalidateCouponPaths() {
  revalidatePath(getAdminPath("/settings/coupons"));
  revalidatePath(getAdminPath("/settings"));
}

export async function createCouponAction(
  raw: unknown,
): Promise<CouponMutationResult> {
  await requirePermission("coupons.create");
  const result = await createAdminCoupon(raw);
  if (result.ok) revalidateCouponPaths();
  return result;
}

export async function updateCouponAction(
  id: string,
  raw: unknown,
): Promise<CouponMutationResult> {
  await requirePermission("coupons.update");
  const result = await updateAdminCoupon(id, raw);
  if (result.ok) revalidateCouponPaths();
  return result;
}

export async function deleteCouponAction(
  id: string,
): Promise<CouponMutationResult> {
  await requirePermission("coupons.delete");
  const result = await deleteAdminCoupon(id);
  if (result.ok) revalidateCouponPaths();
  return result;
}
