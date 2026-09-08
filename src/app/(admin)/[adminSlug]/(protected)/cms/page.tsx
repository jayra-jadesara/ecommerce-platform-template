import { redirect } from "next/navigation";
import { getAdminPath } from "@/config/admin-route";
import { requirePermission } from "@/features/auth/session";

/** Legacy /cms route — keep for bookmarks; send users to the Content hub. */
export default async function AdminCmsPage() {
  await requirePermission("cms.view");
  redirect(getAdminPath("/content"));
}
