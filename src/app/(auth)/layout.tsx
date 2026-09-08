import type { ReactNode } from "react";
import type { Metadata } from "next";
import { buildPrivatePageMetadata } from "@/features/seo/private-metadata";

export const metadata: Metadata = buildPrivatePageMetadata("Account access");

/** Auth route group — pages provide AuthShell themselves. */
export default function AuthGroupLayout({ children }: { children: ReactNode }) {
  return children;
}
