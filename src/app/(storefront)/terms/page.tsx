import type { Metadata } from "next";
import { LegalDocumentPage } from "@/features/cms/components/LegalDocumentPage";
import {
  TERMS_PAGE_SLUG,
  LEGAL_PAGE_META,
} from "@/features/cms/schemas";
import { getLegalStorefrontPage } from "@/features/cms/storefront";
import { metadataForManagedStorePage } from "@/features/seo/managed-page-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getLegalStorefrontPage(TERMS_PAGE_SLUG);
  const meta = LEGAL_PAGE_META.terms;
  return metadataForManagedStorePage({
    pageKey: "terms",
    path: meta.storefrontPath,
    fallbackTitle: page.title || meta.title,
    fallbackDescription: meta.description,
  });
}

export default function TermsPage() {
  return <LegalDocumentPage slug={TERMS_PAGE_SLUG} />;
}
