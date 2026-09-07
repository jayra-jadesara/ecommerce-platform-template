import { redirect } from "next/navigation";
import { requirePermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";

export default async function AdminProductsRedirectPage() {
  await requirePermission("products.view");
  redirect(getAdminPath("/catalog/products"));
}
