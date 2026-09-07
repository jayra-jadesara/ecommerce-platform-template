import type { ReactNode } from "react";
import { AppLayout } from "@/components/layout";
import { getPlatformConfigAsync } from "@/config/site";

export default async function StorefrontLayout({
  children,
}: {
  children: ReactNode;
}) {
  const config = await getPlatformConfigAsync();
  return <AppLayout config={config}>{children}</AppLayout>;
}
