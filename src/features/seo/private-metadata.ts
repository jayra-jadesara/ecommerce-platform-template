import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";

/** Shared noindex metadata for account, cart, checkout, auth, payment. */
export function buildPrivatePageMetadata(title: string): Metadata {
  const base = buildPageMetadata({
    title,
    noIndex: true,
    noFollow: true,
  });
  return {
    ...base,
    // Private surfaces must not advertise a public canonical.
    alternates: undefined,
    openGraph: base.openGraph
      ? { ...base.openGraph, url: undefined }
      : undefined,
  };
}
