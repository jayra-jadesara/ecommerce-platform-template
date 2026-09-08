import { redirect } from "next/navigation";
import { getAdminPath } from "@/config/admin-route";

export default async function AdminEditProductRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`${getAdminPath("/catalog/products")}?panel=edit&id=${id}`);
}
