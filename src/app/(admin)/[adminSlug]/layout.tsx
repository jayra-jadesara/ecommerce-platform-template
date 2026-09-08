import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getAdminRouteSegment } from "@/config/admin-route";

export function generateStaticParams() {
  return [{ adminSlug: getAdminRouteSegment() }];
}

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
