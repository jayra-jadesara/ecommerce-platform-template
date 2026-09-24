import type { Metadata } from "next";
import { LegalDocumentPage } from "@/features/cms/components/LegalDocumentPage";
import {
  DISCLAIMER_PAGE_SLUG,
  LEGAL_PAGE_META,
} from "@/features/cms/schemas";
import { getLegalStorefrontPage } from "@/features/cms/storefront";
import { metadataForManagedStorePage } from "@/features/seo/managed-page-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getLegalStorefrontPage(DISCLAIMER_PAGE_SLUG);
  const meta = LEGAL_PAGE_META.disclaimer;
  return metadataForManagedStorePage({
    pageKey: "disclaimer",
    path: meta.storefrontPath,
    fallbackTitle: page.title || meta.title,
    fallbackDescription: meta.description,
  });
}

export default function DisclaimerPage() {
  return <LegalDocumentPage slug={DISCLAIMER_PAGE_SLUG} />;
}
