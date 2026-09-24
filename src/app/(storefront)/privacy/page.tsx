import type { Metadata } from "next";
import { LegalDocumentPage } from "@/features/cms/components/LegalDocumentPage";
import {
  PRIVACY_PAGE_SLUG,
  LEGAL_PAGE_META,
} from "@/features/cms/schemas";
import { getLegalStorefrontPage } from "@/features/cms/storefront";
import { metadataForManagedStorePage } from "@/features/seo/managed-page-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getLegalStorefrontPage(PRIVACY_PAGE_SLUG);
  const meta = LEGAL_PAGE_META.privacy;
  return metadataForManagedStorePage({
    pageKey: "privacy",
    path: meta.storefrontPath,
    fallbackTitle: page.title || meta.title,
    fallbackDescription: meta.description,
  });
}

export default function PrivacyPage() {
  return <LegalDocumentPage slug={PRIVACY_PAGE_SLUG} />;
}
