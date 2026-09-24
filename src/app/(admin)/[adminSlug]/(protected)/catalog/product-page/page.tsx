import { redirect } from "next/navigation";
import { getAdminPath } from "@/config/admin-route";

export const dynamic = "force-dynamic";

/** Old Product page settings URL → Product settings → detail sections. */
export default function AdminProductPageSettingsRedirect() {
  redirect(`${getAdminPath("/catalog/sizes")}?tab=sections`);
}
