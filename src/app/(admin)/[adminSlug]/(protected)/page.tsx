import { redirect } from "next/navigation";
import { getAdminPath } from "@/config/admin-route";

export default function AdminIndexPage() {
  redirect(getAdminPath("/dashboard"));
}
