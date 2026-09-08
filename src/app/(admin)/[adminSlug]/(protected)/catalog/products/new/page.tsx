import { redirect } from "next/navigation";
import { getAdminPath } from "@/config/admin-route";

export default function AdminNewProductRedirectPage() {
  redirect(`${getAdminPath("/catalog/products")}?panel=new`);
}
