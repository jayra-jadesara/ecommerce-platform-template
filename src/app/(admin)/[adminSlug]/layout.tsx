import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getAdminRouteSegment } from "@/config/admin-route";

/**
 * Do not use generateStaticParams here.
 * With Next 16 Turbopack + nested (protected) under [adminSlug], it can leave
 * dashboard/media/settings unregistered in dev (404 with no Compiling line).
 * Runtime slug check below is enough.
 */
export default async function AdminSlugLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ adminSlug: string }>;
}) {
  const { adminSlug } = await params;
  if (adminSlug !== getAdminRouteSegment()) {
    notFound();
  }
  return children;
}
